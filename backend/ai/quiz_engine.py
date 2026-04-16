import math
import os
import pickle
from collections import Counter, defaultdict


class NaiveBayesQuizModel:
    def __init__(self):
        self.class_counts = Counter()
        self.feature_value_counts = defaultdict(Counter)
        self.feature_values = defaultdict(set)
        self.classes = []
        self.total_samples = 0

    def fit(self, rows, target_key, feature_keys):
        self.class_counts = Counter()
        self.feature_value_counts = defaultdict(Counter)
        self.feature_values = defaultdict(set)
        self.total_samples = len(rows)

        for row in rows:
            label = row[target_key]
            self.class_counts[label] += 1
            for feature in feature_keys:
                value = row[feature]
                self.feature_value_counts[(label, feature)][value] += 1
                self.feature_values[feature].add(value)

        self.classes = sorted(self.class_counts.keys())

    def predict(self, row, feature_keys):
        if not self.classes:
            raise ValueError("Model has not been trained.")

        best_label = None
        best_score = None
        num_classes = len(self.classes)

        for label in self.classes:
            prior = (self.class_counts[label] + 1) / (self.total_samples + num_classes)
            score = math.log(prior)
            for feature in feature_keys:
                value = row[feature]
                counts = self.feature_value_counts[(label, feature)]
                vocab_size = len(self.feature_values[feature])
                likelihood = (counts[value] + 1) / (self.class_counts[label] + vocab_size)
                score += math.log(likelihood)
            if best_score is None or score > best_score:
                best_label = label
                best_score = score

        return best_label

    def to_payload(self):
        return {
            "class_counts": dict(self.class_counts),
            "feature_value_counts": {
                f"{label}|||{feature}": dict(counter)
                for (label, feature), counter in self.feature_value_counts.items()
            },
            "feature_values": {feature: sorted(values) for feature, values in self.feature_values.items()},
            "classes": list(self.classes),
            "total_samples": self.total_samples,
        }

    @classmethod
    def from_payload(cls, payload):
        model = cls()
        model.class_counts = Counter(payload["class_counts"])
        model.feature_value_counts = defaultdict(Counter)
        for key, counts in payload["feature_value_counts"].items():
            label, feature = key.split("|||", 1)
            model.feature_value_counts[(label, feature)] = Counter(counts)
        model.feature_values = defaultdict(set)
        for feature, values in payload["feature_values"].items():
            model.feature_values[feature] = set(values)
        model.classes = list(payload["classes"])
        model.total_samples = int(payload["total_samples"])
        return model


class AdaptiveQuizEngine:
    MODEL_VERSION = 7
    FEATURE_COLUMNS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12"]

    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), "quiz_model.pkl")
        self.questions = [
            {
                "id": 1,
                "question": "Which area interests you most after BAC?",
                "options": [
                    "Sciences & Health",
                    "Technology & Engineering",
                    "Arts, Design & Communication",
                    "Business, Law & Society",
                ],
            },
            {
                "id": 2,
                "question": "What type of university training fits you best?",
                "options": [
                    "Rigorous and structured",
                    "Collaborative and project-based",
                    "Leadership and decision-making",
                    "Flexible and multidisciplinary",
                ],
            },
            {
                "id": 3,
                "question": "Which study environment do you prefer?",
                "options": [
                    "Hospital or science lab",
                    "Field, workshop or design studio",
                    "Company or business environment",
                    "Digital or computer-based environment",
                ],
            },
            {
                "id": 4,
                "question": "What is your main goal after BAC?",
                "options": [
                    "High employability",
                    "Helping people or society",
                    "Building deep expertise",
                    "Keeping several options open",
                ],
            },
            {
                "id": 5,
                "question": "Which type of subjects are you strongest in?",
                "options": [
                    "Biology and natural sciences",
                    "Mathematics and physics",
                    "Languages and expression",
                    "Economics and analysis",
                ],
            },
            {
                "id": 6,
                "question": "What kind of study rhythm suits you best?",
                "options": [
                    "Very demanding and selective",
                    "Balanced with projects and exams",
                    "Creative and portfolio-based",
                    "Progressive with several choices later",
                ],
            },
            {
                "id": 7,
                "question": "What type of career start do you imagine after university?",
                "options": [
                    "Healthcare or scientific profession",
                    "Engineer or tech specialist",
                    "Designer, architect or media role",
                    "Manager, analyst or legal/business role",
                ],
            },
            {
                "id": 8,
                "question": "What matters most in choosing your university path?",
                "options": [
                    "Prestige and selective training",
                    "Practical skills and employability",
                    "Creativity and personal expression",
                    "Versatility and future flexibility",
                ],
            },
            {
                "id": 9,
                "question": "Which learning style helps you progress the most?",
                "options": [
                    "Detailed theory and textbooks",
                    "Labs, coding or practical sessions",
                    "Projects, portfolios and creative production",
                    "Case studies, discussion and analysis",
                ],
            },
            {
                "id": 10,
                "question": "How important is direct contact with people in your future studies or work?",
                "options": [
                    "Very important",
                    "Moderately important",
                    "Useful but not central",
                    "Not very important",
                ],
            },
            {
                "id": 11,
                "question": "What type of challenge motivates you most?",
                "options": [
                    "Solving scientific or medical problems",
                    "Building systems and technical solutions",
                    "Designing ideas, spaces or creative content",
                    "Analyzing organizations, markets or society",
                ],
            },
            {
                "id": 12,
                "question": "What kind of future path do you prefer?",
                "options": [
                    "Long, selective studies with specialization",
                    "A technical path leading to strong job opportunities",
                    "A creative path with visible personal work",
                    "A flexible path with management or social opportunities",
                ],
            },
        ]
        self.answer_mapping = {
            "sciences": "Sciences & Health",
            "tech": "Technology & Engineering",
            "arts": "Arts, Design & Communication",
            "social": "Business, Law & Society",
            "alone": "Rigorous and structured",
            "team": "Collaborative and project-based",
            "lead": "Leadership and decision-making",
            "flex": "Flexible and multidisciplinary",
            "office": "Company or business environment",
            "field": "Field, workshop or design studio",
            "lab": "Hospital or science lab",
            "remote": "Digital or computer-based environment",
            "money": "High employability",
            "impact": "Helping people or society",
            "growth": "Building deep expertise",
            "balance": "Keeping several options open",
            "bio": "Biology and natural sciences",
            "math": "Mathematics and physics",
            "lang": "Languages and expression",
            "eco": "Economics and analysis",
            "demanding": "Very demanding and selective",
            "balanced": "Balanced with projects and exams",
            "creative_rhythm": "Creative and portfolio-based",
            "progressive": "Progressive with several choices later",
            "health_start": "Healthcare or scientific profession",
            "tech_start": "Engineer or tech specialist",
            "design_start": "Designer, architect or media role",
            "business_start": "Manager, analyst or legal/business role",
            "prestige": "Prestige and selective training",
            "practical_outcome": "Practical skills and employability",
            "expression": "Creativity and personal expression",
            "flexibility_future": "Versatility and future flexibility",
            "theory_learning": "Detailed theory and textbooks",
            "practical_learning": "Labs, coding or practical sessions",
            "project_learning": "Projects, portfolios and creative production",
            "analysis_learning": "Case studies, discussion and analysis",
            "people_high": "Very important",
            "people_medium": "Moderately important",
            "people_low": "Useful but not central",
            "people_minimal": "Not very important",
            "science_challenge": "Solving scientific or medical problems",
            "tech_challenge": "Building systems and technical solutions",
            "creative_challenge": "Designing ideas, spaces or creative content",
            "business_challenge": "Analyzing organizations, markets or society",
            "long_path": "Long, selective studies with specialization",
            "technical_path": "A technical path leading to strong job opportunities",
            "creative_path": "A creative path with visible personal work",
            "flexible_path": "A flexible path with management or social opportunities",
        }
        self.valid_answers = {
            "q1": set(self.questions[0]["options"]),
            "q2": set(self.questions[1]["options"]),
            "q3": set(self.questions[2]["options"]),
            "q4": set(self.questions[3]["options"]),
            "q5": set(self.questions[4]["options"]),
            "q6": set(self.questions[5]["options"]),
            "q7": set(self.questions[6]["options"]),
            "q8": set(self.questions[7]["options"]),
            "q9": set(self.questions[8]["options"]),
            "q10": set(self.questions[9]["options"]),
            "q11": set(self.questions[10]["options"]),
            "q12": set(self.questions[11]["options"]),
        }
        self.career_details = {
            "Medicine": {
                "title": "Medicine / Healthcare",
                "icon": "??",
                "summary": "You are methodical and enjoy helping others. Healthcare is a strong match for your profile.",
                "recommendedMajors": ["Medicine", "Pharmacy", "Dentistry"],
                "universities": ["Univ. Alger 1 (Fac de Medecine)", "Univ. Blida", "Univ. Constantine 3", "Univ. Oran 1"],
                "admissionScore": "15.0 - 17.5 / 20",
                "careerOpportunities": ["Hospital Doctor", "Specialist", "Medical Researcher", "Public Health"],
                "skillsToBuild": ["Biology", "Chemistry", "Patient Communication"],
                "firstYearActions": ["Focus on life sciences", "Volunteer in healthcare settings", "Develop study discipline"],
            },
            "Software Engineering": {
                "title": "Software Engineering",
                "icon": "??",
                "summary": "You show analytical thinking and a strong fit for digital problem solving.",
                "recommendedMajors": ["Computer Science", "Software Engineering", "Information Systems"],
                "universities": ["USTHB", "ESI Alger", "Univ. Bejaia", "Univ. Oran 1"],
                "admissionScore": "13.5 - 16.0 / 20",
                "careerOpportunities": ["Software Developer", "Web/Mobile Developer", "Data Scientist", "Cybersecurity"],
                "skillsToBuild": ["Programming", "Algorithms", "Problem Solving"],
                "firstYearActions": ["Learn Python or JavaScript", "Build small projects", "Join coding communities"],
            },
            "Architecture": {
                "title": "Architecture / Design",
                "icon": "???",
                "summary": "Your profile combines creativity, structure, and interest in designing spaces.",
                "recommendedMajors": ["Architecture", "Urban Planning", "Interior Design"],
                "universities": ["EPAU Alger", "Univ. Blida", "Univ. Constantine 1", "Univ. Tlemcen"],
                "admissionScore": "13.0 - 15.5 / 20",
                "careerOpportunities": ["Architect", "Urban Planner", "Interior Designer", "Project Manager"],
                "skillsToBuild": ["Drawing", "3D Modeling", "Design Thinking"],
                "firstYearActions": ["Practice sketching", "Learn CAD tools", "Study architectural history"],
            },
            "Finance": {
                "title": "Finance / Business",
                "icon": "??",
                "summary": "You seem comfortable with numbers, strategy, and results-oriented environments.",
                "recommendedMajors": ["Finance", "Accounting", "Economics"],
                "universities": ["HEC Alger", "Univ. Alger 3", "Univ. Tlemcen", "Univ. Bejaia"],
                "admissionScore": "12.5 - 15.0 / 20",
                "careerOpportunities": ["Financial Analyst", "Accountant", "Banker", "Business Consultant"],
                "skillsToBuild": ["Excel", "Financial Analysis", "Communication"],
                "firstYearActions": ["Follow economic news", "Learn accounting basics", "Explore entrepreneurship clubs"],
            },
            "Journalism": {
                "title": "Journalism / Communication",
                "icon": "??",
                "summary": "You have strong communication potential and curiosity about people and society.",
                "recommendedMajors": ["Journalism", "Media Studies", "Communications"],
                "universities": ["Univ. Alger 3", "Univ. Constantine 2", "Univ. Oran 1", "Univ. Annaba"],
                "admissionScore": "11.0 - 14.0 / 20",
                "careerOpportunities": ["Journalist", "Content Creator", "Communication Officer", "Editor"],
                "skillsToBuild": ["Writing", "Research", "Interviewing"],
                "firstYearActions": ["Start a blog", "Practice reporting", "Build multimedia storytelling skills"],
            },
        }
        self._ensure_model()

    def _ensure_model(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as model_file:
                    payload = pickle.load(model_file)
                if isinstance(payload, dict) and payload.get("version") == self.MODEL_VERSION:
                    self.model = NaiveBayesQuizModel.from_payload(payload["model_state"])
                    self.training_samples = payload["training_samples"]
                    return
            except Exception:
                pass
        self._train_model()

    def _build_training_dataset(self):
        prototypes = [
            {
                "career": "Medicine",
                "q1": ["Sciences & Health"],
                "q2": ["Rigorous and structured", "Collaborative and project-based"],
                "q3": ["Hospital or science lab"],
                "q4": ["Helping people or society", "Building deep expertise"],
                "q5": ["Biology and natural sciences"],
                "q6": ["Very demanding and selective", "Balanced with projects and exams"],
                "q7": ["Healthcare or scientific profession"],
                "q8": ["Prestige and selective training", "Practical skills and employability"],
                "q9": ["Detailed theory and textbooks", "Labs, coding or practical sessions"],
                "q10": ["Very important", "Moderately important"],
                "q11": ["Solving scientific or medical problems"],
                "q12": ["Long, selective studies with specialization"],
            },
            {
                "career": "Software Engineering",
                "q1": ["Technology & Engineering", "Sciences & Health"],
                "q2": ["Rigorous and structured", "Collaborative and project-based", "Flexible and multidisciplinary"],
                "q3": ["Digital or computer-based environment"],
                "q4": ["High employability", "Building deep expertise", "Keeping several options open"],
                "q5": ["Mathematics and physics"],
                "q6": ["Very demanding and selective", "Balanced with projects and exams"],
                "q7": ["Engineer or tech specialist"],
                "q8": ["Prestige and selective training", "Practical skills and employability"],
                "q9": ["Labs, coding or practical sessions", "Detailed theory and textbooks"],
                "q10": ["Useful but not central", "Not very important"],
                "q11": ["Building systems and technical solutions"],
                "q12": ["A technical path leading to strong job opportunities"],
            },
            {
                "career": "Architecture",
                "q1": ["Arts, Design & Communication", "Technology & Engineering"],
                "q2": ["Collaborative and project-based", "Flexible and multidisciplinary"],
                "q3": ["Field, workshop or design studio"],
                "q4": ["Building deep expertise", "Helping people or society"],
                "q5": ["Mathematics and physics", "Languages and expression"],
                "q6": ["Creative and portfolio-based", "Balanced with projects and exams"],
                "q7": ["Designer, architect or media role"],
                "q8": ["Creativity and personal expression", "Prestige and selective training"],
                "q9": ["Projects, portfolios and creative production", "Labs, coding or practical sessions"],
                "q10": ["Moderately important", "Useful but not central"],
                "q11": ["Designing ideas, spaces or creative content"],
                "q12": ["A creative path with visible personal work"],
            },
            {
                "career": "Finance",
                "q1": ["Business, Law & Society", "Technology & Engineering"],
                "q2": ["Leadership and decision-making", "Collaborative and project-based", "Flexible and multidisciplinary"],
                "q3": ["Company or business environment"],
                "q4": ["High employability", "Keeping several options open"],
                "q5": ["Economics and analysis", "Mathematics and physics"],
                "q6": ["Balanced with projects and exams", "Progressive with several choices later"],
                "q7": ["Manager, analyst or legal/business role"],
                "q8": ["Practical skills and employability", "Versatility and future flexibility"],
                "q9": ["Case studies, discussion and analysis", "Detailed theory and textbooks"],
                "q10": ["Moderately important", "Very important"],
                "q11": ["Analyzing organizations, markets or society"],
                "q12": ["A flexible path with management or social opportunities"],
            },
            {
                "career": "Journalism",
                "q1": ["Arts, Design & Communication", "Business, Law & Society"],
                "q2": ["Collaborative and project-based", "Leadership and decision-making", "Flexible and multidisciplinary"],
                "q3": ["Field, workshop or design studio", "Company or business environment"],
                "q4": ["Helping people or society", "Keeping several options open"],
                "q5": ["Languages and expression", "Economics and analysis"],
                "q6": ["Creative and portfolio-based", "Progressive with several choices later"],
                "q7": ["Designer, architect or media role", "Manager, analyst or legal/business role"],
                "q8": ["Creativity and personal expression", "Versatility and future flexibility"],
                "q9": ["Projects, portfolios and creative production", "Case studies, discussion and analysis"],
                "q10": ["Very important", "Moderately important"],
                "q11": ["Designing ideas, spaces or creative content", "Analyzing organizations, markets or society"],
                "q12": ["A creative path with visible personal work", "A flexible path with management or social opportunities"],
            },
        ]
        rows = []
        for prototype in prototypes:
            for q1 in prototype["q1"]:
                for q2 in prototype["q2"]:
                    for q3 in prototype["q3"]:
                        for q4 in prototype["q4"]:
                            for q5 in prototype["q5"]:
                                for q6 in prototype["q6"]:
                                    for q7 in prototype["q7"]:
                                        for q8 in prototype["q8"]:
                                            for q9 in prototype["q9"]:
                                                for q10 in prototype["q10"]:
                                                    for q11 in prototype["q11"]:
                                                        for q12 in prototype["q12"]:
                                                            rows.append(
                                                                {
                                                                    "q1": q1,
                                                                    "q2": q2,
                                                                    "q3": q3,
                                                                    "q4": q4,
                                                                    "q5": q5,
                                                                    "q6": q6,
                                                                    "q7": q7,
                                                                    "q8": q8,
                                                                    "q9": q9,
                                                                    "q10": q10,
                                                                    "q11": q11,
                                                                    "q12": q12,
                                                                    "filiere": prototype["career"],
                                                                }
                                                            )
        return rows

    def _train_model(self):
        print("[AI] Training naive Bayes quiz model...")
        data = self._build_training_dataset()
        self.model = NaiveBayesQuizModel()
        self.model.fit(data, target_key="filiere", feature_keys=self.FEATURE_COLUMNS)
        self.training_samples = len(data)
        payload = {
            "version": self.MODEL_VERSION,
            "model_state": self.model.to_payload(),
            "training_samples": self.training_samples,
        }
        with open(self.model_path, "wb") as model_file:
            pickle.dump(payload, model_file)
        print(f"[AI] Quiz model trained with {self.training_samples} samples.")

    def get_question(self, index: int):
        if 0 <= index < len(self.questions):
            return self.questions[index]
        return None

    def _normalize_answers(self, answers):
        normalized = []
        for answer in answers[: len(self.FEATURE_COLUMNS)]:
            value = str(answer).strip()
            mapped = self.answer_mapping.get(value, value)
            normalized.append(mapped)
        return normalized

    def _row_from_answers(self, answers):
        row = {}
        for index, answer in enumerate(answers):
            column = f"q{index + 1}"
            if answer not in self.valid_answers[column]:
                raise ValueError(f"Unsupported answer for {column}: {answer}")
            row[column] = answer
        return row

    def predict_career(self, answers: list):
        normalized_answers = self._normalize_answers(answers)
        if len(normalized_answers) != len(self.FEATURE_COLUMNS):
            raise ValueError(f"Exactly {len(self.FEATURE_COLUMNS)} quiz answers are required.")

        row = self._row_from_answers(normalized_answers)
        prediction = self.model.predict(row, feature_keys=self.FEATURE_COLUMNS)
        print(f"[AI] Prediction: {prediction}")
        return self.career_details[prediction]
