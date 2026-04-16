import os
import sqlite3
from sklearn.naive_bayes import CategoricalNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder


class EduPathRecommender:
    MODEL_FEATURES = ["stream", "average_band", "math_band", "physics_band", "subject3_band", "location_pref"]

    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", "edupath.sqlite")
        self.track_keywords = {
            "computer": ["computer", "software", "cyber", "data", "ai", "telecommunication", "electronics"],
            "engineering": ["engineering", "industrial", "electrical", "mechanical", "civil", "electronics", "telecommunication"],
            "medical": ["medicine", "pharmacy", "dentistry", "biology", "biotechnology", "chemistry"],
            "business": ["finance", "management", "marketing", "economics"],
            "humanities": ["law", "psychology", "english", "media", "philosophy", "sociology", "journal"],
            "science": ["mathematics", "physics", "chemistry", "biology", "biotechnology"],
        }
        self.stream_rules = {
            "technique_math": {
                "weights": {"computer": 1.0, "engineering": 1.0, "science": 0.7, "business": 0.35, "medical": 0.15, "humanities": 0.05, "general": 0.4},
                "allowed": {"computer", "engineering", "science", "business", "general"},
                "discouraged": {"medical", "humanities"},
            },
            "mathematiques": {
                "weights": {"computer": 1.0, "engineering": 0.95, "science": 0.85, "business": 0.55, "medical": 0.25, "humanities": 0.1, "general": 0.45},
                "allowed": {"computer", "engineering", "science", "business", "general"},
                "discouraged": {"medical", "humanities"},
            },
            "sciences": {
                "weights": {"medical": 1.0, "science": 0.95, "computer": 0.72, "engineering": 0.74, "business": 0.32, "humanities": 0.12, "general": 0.45},
                "allowed": {"medical", "science", "computer", "engineering", "business", "general"},
                "discouraged": {"humanities"},
            },
            "lettres_philo": {
                "weights": {"humanities": 1.0, "business": 0.5, "general": 0.4, "computer": 0.05, "engineering": 0.05, "medical": 0.08, "science": 0.08},
                "allowed": {"humanities", "business", "general"},
                "discouraged": {"computer", "engineering", "medical", "science"},
            },
            "default": {
                "weights": {"computer": 0.4, "engineering": 0.4, "science": 0.4, "medical": 0.4, "business": 0.4, "humanities": 0.4, "general": 0.4},
                "allowed": {"computer", "engineering", "science", "medical", "business", "humanities", "general"},
                "discouraged": set(),
            },
        }
        self.profile_model: Pipeline | None = None
        self.profile_model_classes: list[str] = []
        self._train_profile_model()

    def _load_programs(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
              s.name AS speciality,
              s.min_score AS min_score,
              s.min_score_1 AS min_score_1,
              s.min_score_2 AS min_score_2,
              s.min_score_3 AS min_score_3,
              u.name AS university,
              u.city AS city,
              u.type AS university_type,
              GROUP_CONCAT(m.name, '||') AS modules
            FROM specialities s
            JOIN universities u ON u.id = s.university_id
            LEFT JOIN modules m ON m.speciality_id = s.id
            GROUP BY s.id, u.id
            ORDER BY u.name, s.name
            """
        ).fetchall()
        conn.close()
        return rows

    def _normalize_stream(self, bac_stream: str) -> str:
        stream = (bac_stream or "").strip().lower()
        if "technique" in stream:
            return "technique_math"
        if "math" in stream:
            return "mathematiques"
        if "science" in stream:
            return "sciences"
        if "lettres" in stream or "philo" in stream:
            return "lettres_philo"
        return "default"

    def _band_grade(self, value: float) -> str:
        if value >= 17:
            return "excellent"
        if value >= 14:
            return "strong"
        if value >= 11:
            return "fair"
        return "low"

    def _location_preference(self, wilaya: str) -> str:
        return "local" if (wilaya or "").strip() else "open"

    def _profile_to_features(self, bac_stream: str, bac_average: float, math_grade: float, physics_grade: float, subject3_grade: float, wilaya: str):
        return {
            "stream": self._normalize_stream(bac_stream),
            "average_band": self._band_grade(bac_average),
            "math_band": self._band_grade(math_grade),
            "physics_band": self._band_grade(physics_grade),
            "subject3_band": self._band_grade(subject3_grade),
            "location_pref": self._location_preference(wilaya),
        }

    def _build_training_dataset(self):
        prototypes = [
            {"track": "computer", "stream": ["mathematiques", "sciences", "technique_math"], "average_band": ["strong", "excellent"], "math_band": ["strong", "excellent"], "physics_band": ["fair", "strong", "excellent"], "subject3_band": ["fair", "strong"], "location_pref": ["local", "open"]},
            {"track": "engineering", "stream": ["mathematiques", "technique_math", "sciences"], "average_band": ["strong", "excellent"], "math_band": ["strong", "excellent"], "physics_band": ["strong", "excellent"], "subject3_band": ["fair", "strong"], "location_pref": ["local", "open"]},
            {"track": "medical", "stream": ["sciences"], "average_band": ["strong", "excellent"], "math_band": ["fair", "strong"], "physics_band": ["fair", "strong"], "subject3_band": ["strong", "excellent"], "location_pref": ["local", "open"]},
            {"track": "business", "stream": ["mathematiques", "sciences", "default", "lettres_philo"], "average_band": ["fair", "strong", "excellent"], "math_band": ["fair", "strong"], "physics_band": ["low", "fair", "strong"], "subject3_band": ["fair", "strong", "excellent"], "location_pref": ["local", "open"]},
            {"track": "humanities", "stream": ["lettres_philo", "default"], "average_band": ["fair", "strong"], "math_band": ["low", "fair"], "physics_band": ["low", "fair"], "subject3_band": ["strong", "excellent"], "location_pref": ["local", "open"]},
            {"track": "science", "stream": ["sciences", "mathematiques", "technique_math"], "average_band": ["fair", "strong", "excellent"], "math_band": ["strong", "excellent"], "physics_band": ["strong", "excellent"], "subject3_band": ["strong", "excellent"], "location_pref": ["local", "open"]},
            {"track": "general", "stream": ["default", "sciences", "mathematiques", "lettres_philo"], "average_band": ["fair", "strong"], "math_band": ["fair", "strong"], "physics_band": ["fair", "strong"], "subject3_band": ["fair", "strong"], "location_pref": ["local", "open"]},
        ]
        rows = []
        for prototype in prototypes:
            for stream in prototype["stream"]:
                for average_band in prototype["average_band"]:
                    for math_band in prototype["math_band"]:
                        for physics_band in prototype["physics_band"]:
                            for subject3_band in prototype["subject3_band"]:
                                for location_pref in prototype["location_pref"]:
                                    rows.append(
                                        {
                                            "stream": stream,
                                            "average_band": average_band,
                                            "math_band": math_band,
                                            "physics_band": physics_band,
                                            "subject3_band": subject3_band,
                                            "location_pref": location_pref,
                                            "track": prototype["track"],
                                        }
                                    )
        return rows

    def _train_profile_model(self):
        data = self._build_training_dataset()
        x_train = [[row[feature] for feature in self.MODEL_FEATURES] for row in data]
        y_train = [row["track"] for row in data]
        self.profile_model = Pipeline(
            steps=[
                ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
                ("model", CategoricalNB()),
            ]
        )
        self.profile_model.fit(x_train, y_train)
        self.profile_model_classes = list(self.profile_model.named_steps["model"].classes_)

    def _predict_track_probabilities(self, profile_features: dict) -> dict[str, float]:
        if self.profile_model is None:
            raise ValueError("Profile model has not been trained.")
        row = [[profile_features[feature] for feature in self.MODEL_FEATURES]]
        probabilities = self.profile_model.predict_proba(row)[0]
        return {
            label: float(probability)
            for label, probability in zip(self.profile_model_classes, probabilities)
        }

    def _program_track(self, speciality_name: str) -> str:
        name = (speciality_name or "").lower()
        for track, keywords in self.track_keywords.items():
            if any(keyword in name for keyword in keywords):
                return track
        return "general"

    def _subject_fit(self, track: str, math_grade: float, physics_grade: float, subject3_grade: float) -> float:
        math_norm = max(0.0, min(math_grade / 20.0, 1.0))
        physics_norm = max(0.0, min(physics_grade / 20.0, 1.0))
        subject3_norm = max(0.0, min(subject3_grade / 20.0, 1.0))

        if track == "computer":
            return (math_norm * 0.50) + (physics_norm * 0.30) + (subject3_norm * 0.20)
        if track == "engineering":
            return (math_norm * 0.40) + (physics_norm * 0.40) + (subject3_norm * 0.20)
        if track == "medical":
            return (subject3_norm * 0.45) + (physics_norm * 0.30) + (math_norm * 0.25)
        if track == "business":
            return (math_norm * 0.35) + (subject3_norm * 0.35) + (physics_norm * 0.30)
        if track == "humanities":
            return (subject3_norm * 0.60) + (physics_norm * 0.20) + (math_norm * 0.20)
        if track == "science":
            return (math_norm * 0.34) + (physics_norm * 0.33) + (subject3_norm * 0.33)
        return (math_norm + physics_norm + subject3_norm) / 3

    def _subject_threshold_fit(self, row, math_grade: float, physics_grade: float, subject3_grade: float):
        thresholds = [
            float(row["min_score_1"] if row["min_score_1"] is not None else row["min_score"]),
            float(row["min_score_2"] if row["min_score_2"] is not None else row["min_score"]),
            float(row["min_score_3"] if row["min_score_3"] is not None else row["min_score"]),
        ]
        grades = [math_grade, physics_grade, subject3_grade]

        close_subjects = 0
        total_score = 0.0
        for grade, threshold in zip(grades, thresholds):
            gap = grade - threshold
            if gap >= 0:
                total_score += 1.0
                close_subjects += 1
            elif gap >= -1.0:
                total_score += 0.75
                close_subjects += 1
            elif gap >= -2.0:
                total_score += 0.5
            else:
                total_score += 0.1
        return total_score / 3.0, close_subjects

    def _city_bonus(self, preferred_wilaya: str, city: str) -> float:
        if not preferred_wilaya or not city:
            return 0.0
        return 0.08 if preferred_wilaya.strip().lower() == city.strip().lower() else 0.0

    def _subject_labels(self, stream_key: str):
        if stream_key == "technique_math":
            return ["Technical Science", "Physics", "Mathematics"]
        if stream_key == "lettres_philo":
            return ["Literature", "Philosophy", "History-Geography"]
        return ["Mathematics", "Physics", "Subject 3"]

    def _subject_breakdown(self, row, stream_key: str, math_grade: float, physics_grade: float, subject3_grade: float):
        labels = self._subject_labels(stream_key)
        grades = [math_grade, physics_grade, subject3_grade]
        thresholds = [
            float(row["min_score_1"] if row["min_score_1"] is not None else row["min_score"]),
            float(row["min_score_2"] if row["min_score_2"] is not None else row["min_score"]),
            float(row["min_score_3"] if row["min_score_3"] is not None else row["min_score"]),
        ]
        details = []
        for label, grade, threshold in zip(labels, grades, thresholds):
            gap = round(grade - threshold, 2)
            if gap >= 0:
                status = "above threshold"
            elif gap >= -1.0:
                status = "close to threshold"
            else:
                status = "below threshold"
            details.append(
                {
                    "label": label,
                    "grade": round(grade, 2),
                    "threshold": round(threshold, 2),
                    "gap": gap,
                    "status": status,
                }
            )
        return details

    def recommend(self, profile: dict, top_n: int = 5):
        bac_stream = profile.get("bac_stream", "")
        bac_average = float(profile.get("bac_average", 0) or 0)
        math_grade = float(profile.get("math_grade", 0) or 0)
        physics_grade = float(profile.get("physics_grade", 0) or 0)
        subject3_grade = float(profile.get("subject3_grade", 0) or 0)
        wilaya = profile.get("wilaya", "")

        stream_key = self._normalize_stream(bac_stream)
        stream_rule = self.stream_rules[stream_key]
        profile_features = self._profile_to_features(bac_stream, bac_average, math_grade, physics_grade, subject3_grade, wilaya)
        track_probabilities = self._predict_track_probabilities(profile_features)
        programs = self._load_programs()
        ranked = []

        for row in programs:
            track = self._program_track(row["speciality"])
            if track in stream_rule["discouraged"]:
                continue
            if track not in stream_rule["allowed"] and track != "general":
                continue

            stream_fit = stream_rule["weights"].get(track, stream_rule["weights"]["general"])
            subject_fit = self._subject_fit(track, math_grade, physics_grade, subject3_grade)
            threshold_fit, close_subjects = self._subject_threshold_fit(row, math_grade, physics_grade, subject3_grade)
            ai_fit = track_probabilities.get(track, track_probabilities.get("general", 0.0))

            required_bac = float(row["min_score"])
            gap = bac_average - required_bac
            eligible = gap >= 0 and threshold_fit >= 0.75
            borderline = gap >= -0.75 and threshold_fit >= 0.5

            if eligible:
                bac_fit = max(0.72, 1 - min(abs(gap), 5.0) / 8.0)
            elif borderline:
                bac_fit = max(0.45, 0.72 - min(abs(gap), 2.5) / 6.0)
            else:
                continue

            city_bonus = self._city_bonus(wilaya, row["city"])
            final_score = (
                (bac_fit * 0.36)
                + (threshold_fit * 0.24)
                + (subject_fit * 0.16)
                + (stream_fit * 0.08)
                + (ai_fit * 0.12)
                + city_bonus
            )

            modules = row["modules"].split("||") if row["modules"] else []
            recommendation_level = "Strong Match" if eligible and final_score >= 0.82 else "Good Match" if eligible else "Borderline Match"
            breakdown = self._subject_breakdown(row, stream_key, math_grade, physics_grade, subject3_grade)
            ai_confidence = round(ai_fit * 100, 1)

            reason_parts = [recommendation_level]
            if eligible:
                reason_parts.append(f"BAC eligible: {bac_average:.2f}/{required_bac:.2f}")
            else:
                reason_parts.append(f"Near threshold: {bac_average:.2f}/{required_bac:.2f}")
            reason_parts.append(f"Branch aligned: {track}")
            reason_parts.append(f"AI fit: {ai_confidence:.1f}%")
            reason_parts.append(f"Subject readiness: {close_subjects}/3")
            if city_bonus > 0:
                reason_parts.append(f"Local option: {row['city']}")

            why = [
                f"This speciality belongs to the {track} track, which matches your BAC branch {bac_stream}.",
                f"Your BAC average is {bac_average:.2f}/20 for a required threshold of {required_bac:.2f}/20.",
                f"The profile model gives this track an AI compatibility score of {ai_confidence:.1f}%.",
                f"You meet or are close to {close_subjects} out of 3 subject thresholds.",
            ]
            if city_bonus > 0:
                why.append(f"It is also located in {row['city']}, which matches your wilaya preference.")
            if modules:
                why.append(f"Typical first modules include {', '.join(modules[:3])}.")

            ranked.append(
                {
                    "program": {
                        "name": row["speciality"],
                        "university": row["university"],
                        "min_score": round(required_bac, 2),
                        "min_score_1": round(float(row["min_score_1"] if row["min_score_1"] is not None else row["min_score"]), 2),
                        "min_score_2": round(float(row["min_score_2"] if row["min_score_2"] is not None else row["min_score"]), 2),
                        "min_score_3": round(float(row["min_score_3"] if row["min_score_3"] is not None else row["min_score"]), 2),
                        "city": row["city"],
                        "type": row["university_type"],
                        "modules": modules,
                    },
                    "match_percentage": round(final_score * 100, 1),
                    "ai_confidence": ai_confidence,
                    "eligible": eligible,
                    "recommendation_level": recommendation_level,
                    "reason": " | ".join(reason_parts),
                    "why_recommended": why,
                    "subject_breakdown": breakdown,
                }
            )

        ranked.sort(
            key=lambda item: (
                item["eligible"],
                item["match_percentage"],
                -item["program"]["min_score"],
            ),
            reverse=True,
        )
        return ranked[:top_n]
