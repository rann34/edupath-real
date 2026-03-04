import hashlib
import hmac
import json
import sqlite3
import secrets
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
DB_PATH = Path(__file__).resolve().parent / "edupath.sqlite"
TOKEN_SECRET = "edupath-dev-secret-change-in-prod"
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _b64_encode(value: str) -> str:
    return urlsafe_b64encode(value.encode("utf-8")).decode("utf-8").rstrip("=")


def _b64_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return urlsafe_b64decode((value + padding).encode("utf-8")).decode("utf-8")


def create_token(email: str) -> str:
    payload = {"email": email, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload_b64 = _b64_encode(payload_json)
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_token(token: str) -> str | None:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_sig = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_sig):
        return None

    try:
        payload = json.loads(_b64_decode(payload_b64))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
        return None

    if int(payload.get("exp", 0)) < int(time.time()):
        return None

    email = payload.get("email")
    if not isinstance(email, str) or not email:
        return None
    return email


def init_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            bac_stream TEXT NOT NULL DEFAULT 'Sciences',
            bac_average REAL NOT NULL DEFAULT 0,
            math_grade REAL NOT NULL DEFAULT 0,
            physics_grade REAL NOT NULL DEFAULT 0,
            subject3_grade REAL NOT NULL DEFAULT 0,
            wilaya TEXT NOT NULL DEFAULT 'Algiers'
        )
        """
    )
    # Simple migration for existing databases created before these columns existed.
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "bac_average" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN bac_average REAL NOT NULL DEFAULT 0")
    if "math_grade" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN math_grade REAL NOT NULL DEFAULT 0")
    if "physics_grade" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN physics_grade REAL NOT NULL DEFAULT 0")
    if "subject3_grade" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN subject3_grade REAL NOT NULL DEFAULT 0")
    if "wilaya" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN wilaya TEXT NOT NULL DEFAULT 'Algiers'")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS universities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            min_score REAL NOT NULL,
            type TEXT NOT NULL,
            city TEXT NOT NULL,
            gradient TEXT NOT NULL,
            icon TEXT NOT NULL,
            badge TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS specialities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            university_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            min_score REAL NOT NULL,
            FOREIGN KEY(university_id) REFERENCES universities(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            speciality_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY(speciality_id) REFERENCES specialities(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS careers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            demand TEXT NOT NULL,
            salary TEXT NOT NULL,
            icon TEXT NOT NULL,
            icon_bg TEXT NOT NULL,
            icon_ring TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS career_roadmap (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            career_id INTEGER NOT NULL,
            step_order INTEGER NOT NULL,
            step_text TEXT NOT NULL,
            FOREIGN KEY(career_id) REFERENCES careers(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS career_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            career_id INTEGER NOT NULL,
            skill TEXT NOT NULL,
            FOREIGN KEY(career_id) REFERENCES careers(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS career_opportunities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            career_id INTEGER NOT NULL,
            opportunity TEXT NOT NULL,
            FOREIGN KEY(career_id) REFERENCES careers(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at INTEGER NOT NULL,
            used_at INTEGER,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )


def seed_users(conn: sqlite3.Connection) -> None:
    seed_email = "student@example.com"
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (seed_email,)).fetchone()
    if existing is None:
        conn.execute(
            """
            INSERT INTO users(name, email, password_hash, bac_stream, bac_average, math_grade, physics_grade, subject3_grade, wilaya)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Alaa Bensalem", seed_email, hash_password("123456"), "Sciences", 16.5, 17.0, 16.0, 15.0, "Algiers"),
        )


def seed_universities(conn: sqlite3.Connection) -> None:
    data = [
        {
            "name": "USTHB",
            "description": "University of Science and Technology Houari Boumediene",
            "min_score": 14.50,
            "type": "Grande Ecole",
            "city": "Algiers",
            "gradient": "from-blue-500 to-blue-700",
            "icon": "🏛️",
            "badge": "bg-blue-500/30",
            "specialities": [
                {"name": "Computer Science", "min_score": 16.00, "modules": ["Algorithms", "Data Structures", "Operating Systems", "Databases"]},
                {"name": "Telecommunications", "min_score": 15.20, "modules": ["Signals", "Network Protocols", "Wireless Systems", "Digital Communications"]},
                {"name": "Chemical Engineering", "min_score": 14.50, "modules": ["Thermodynamics", "Process Control", "Industrial Chemistry", "Fluid Mechanics"]},
            ],
        },
        {
            "name": "University of Algiers 1",
            "description": "Faculty of Medicine - Benyoucef Benkhedda",
            "min_score": 16.00,
            "type": "University",
            "city": "Algiers",
            "gradient": "from-green-500 to-green-700",
            "icon": "🏥",
            "badge": "bg-green-500/30",
            "specialities": [
                {"name": "Medicine", "min_score": 17.00, "modules": ["Anatomy", "Physiology", "Biochemistry", "Clinical Skills"]},
                {"name": "Pharmacy", "min_score": 16.50, "modules": ["Pharmacology", "Medicinal Chemistry", "Pharmaceutics", "Toxicology"]},
                {"name": "Dentistry", "min_score": 16.30, "modules": ["Oral Anatomy", "Dental Materials", "Oral Pathology", "Prosthodontics"]},
            ],
        },
        {
            "name": "ENP",
            "description": "National Polytechnic School - Engineering",
            "min_score": 17.00,
            "type": "Grande Ecole",
            "city": "Algiers",
            "gradient": "from-purple-500 to-purple-700",
            "icon": "⚡",
            "badge": "bg-purple-500/30",
            "specialities": [
                {"name": "Electrical Engineering", "min_score": 17.00, "modules": ["Circuit Theory", "Power Systems", "Control Systems", "Electrical Machines"]},
                {"name": "Mechanical Engineering", "min_score": 16.70, "modules": ["Statics", "Dynamics", "Thermal Systems", "Manufacturing"]},
                {"name": "Industrial Engineering", "min_score": 16.40, "modules": ["Operations Research", "Quality Control", "Supply Chain", "Project Planning"]},
            ],
        },
        {
            "name": "ESI",
            "description": "Higher School of Computer Science",
            "min_score": 16.50,
            "type": "Grande Ecole",
            "city": "Algiers",
            "gradient": "from-orange-500 to-orange-700",
            "icon": "💻",
            "badge": "bg-orange-500/30",
            "specialities": [
                {"name": "Software Engineering", "min_score": 16.80, "modules": ["Software Design", "Web Development", "Testing", "DevOps"]},
                {"name": "AI & Data Science", "min_score": 16.90, "modules": ["Machine Learning", "Statistics", "Data Mining", "Deep Learning"]},
                {"name": "Cybersecurity", "min_score": 16.50, "modules": ["Network Security", "Cryptography", "Ethical Hacking", "Security Auditing"]},
            ],
        },
        {
            "name": "USTO-MB",
            "description": "University of Science and Technology - Mohamed Boudiaf",
            "min_score": 13.50,
            "type": "University",
            "city": "Oran",
            "gradient": "from-red-500 to-red-700",
            "icon": "🔬",
            "badge": "bg-red-500/30",
            "specialities": [
                {"name": "Civil Engineering", "min_score": 14.20, "modules": ["Structural Analysis", "Concrete Design", "Geotechnics", "Hydraulics"]},
                {"name": "Electronics", "min_score": 14.00, "modules": ["Analog Electronics", "Digital Systems", "Embedded Systems", "Instrumentation"]},
                {"name": "Biotechnology", "min_score": 13.50, "modules": ["Cell Biology", "Genetics", "Bioprocessing", "Molecular Biology"]},
            ],
        },
        {
            "name": "University of Algiers 2",
            "description": "Faculty of Humanities and Social Sciences",
            "min_score": 12.40,
            "type": "University",
            "city": "Algiers",
            "gradient": "from-indigo-500 to-blue-700",
            "icon": "📚",
            "badge": "bg-indigo-500/30",
            "specialities": [
                {"name": "Law", "min_score": 13.50, "modules": ["Constitutional Law", "Civil Law", "Administrative Law", "Legal Methodology"]},
                {"name": "Psychology", "min_score": 12.80, "modules": ["General Psychology", "Cognitive Psychology", "Psychometrics", "Research Methods"]},
                {"name": "Sociology", "min_score": 12.60, "modules": ["Social Theory", "Sociological Methods", "Demography", "Field Research"]},
                {"name": "English Language and Literature", "min_score": 12.50, "modules": ["Linguistics", "Literary Analysis", "Academic Writing", "Translation"]},
                {"name": "Media and Communication", "min_score": 12.90, "modules": ["Media Studies", "Public Speaking", "Digital Communication", "Content Strategy"]},
                {"name": "Philosophy", "min_score": 12.40, "modules": ["Logic", "Ethics", "History of Philosophy", "Critical Thinking"]},
            ],
        },
        {
            "name": "University of Algiers 1 - Faculty of Sciences",
            "description": "Benyoucef Benkhedda - Faculty of Sciences",
            "min_score": 13.80,
            "type": "University",
            "city": "Algiers",
            "gradient": "from-sky-500 to-blue-700",
            "icon": "🧪",
            "badge": "bg-sky-500/30",
            "specialities": [
                {"name": "Computer Science", "min_score": 15.50, "modules": ["Algorithms", "Programming", "Databases", "Operating Systems"]},
                {"name": "Mathematics", "min_score": 14.60, "modules": ["Analysis", "Algebra", "Probability", "Numerical Methods"]},
                {"name": "Physics", "min_score": 14.20, "modules": ["Mechanics", "Electromagnetism", "Thermodynamics", "Optics"]},
                {"name": "Chemistry", "min_score": 13.90, "modules": ["Organic Chemistry", "Analytical Chemistry", "Physical Chemistry", "Lab Methods"]},
                {"name": "Biology", "min_score": 13.80, "modules": ["Cell Biology", "Genetics", "Biochemistry", "Microbiology"]},
            ],
        },
        {
            "name": "University of Oran 1",
            "description": "Ahmed Ben Bella - Major multidisciplinary university",
            "min_score": 13.20,
            "type": "University",
            "city": "Oran",
            "gradient": "from-emerald-500 to-teal-700",
            "icon": "🏙️",
            "badge": "bg-emerald-500/30",
            "specialities": [
                {"name": "Computer Science", "min_score": 14.80, "modules": ["Programming", "Software Engineering", "Networks", "Databases"]},
                {"name": "Economics", "min_score": 13.50, "modules": ["Microeconomics", "Macroeconomics", "Econometrics", "Public Economics"]},
                {"name": "Law", "min_score": 13.30, "modules": ["Civil Law", "Criminal Law", "Administrative Law", "Legal Writing"]},
                {"name": "English Language and Literature", "min_score": 13.20, "modules": ["Linguistics", "Literary Studies", "Translation", "Academic Communication"]},
            ],
        },
        {
            "name": "University of Constantine 1",
            "description": "Freres Mentouri - Sciences, engineering, and humanities",
            "min_score": 13.70,
            "type": "University",
            "city": "Constantine",
            "gradient": "from-indigo-500 to-cyan-700",
            "icon": "🏛️",
            "badge": "bg-indigo-500/30",
            "specialities": [
                {"name": "Computer Science", "min_score": 15.20, "modules": ["Algorithms", "Software Engineering", "AI Basics", "Databases"]},
                {"name": "Civil Engineering", "min_score": 14.40, "modules": ["Structural Mechanics", "Geotechnics", "Hydraulics", "Construction Materials"]},
                {"name": "Psychology", "min_score": 13.40, "modules": ["General Psychology", "Developmental Psychology", "Psychometrics", "Counseling Basics"]},
                {"name": "Law", "min_score": 13.60, "modules": ["Constitutional Law", "Civil Law", "Criminal Law", "Legal Methodology"]},
            ],
        },
        {
            "name": "University of Blida 1",
            "description": "Saad Dahlab - Science and applied fields",
            "min_score": 13.00,
            "type": "University",
            "city": "Blida",
            "gradient": "from-rose-500 to-fuchsia-700",
            "icon": "🔭",
            "badge": "bg-rose-500/30",
            "specialities": [
                {"name": "Biotechnology", "min_score": 13.80, "modules": ["Molecular Biology", "Genetics", "Bioprocess Engineering", "Bioinformatics"]},
                {"name": "Computer Science", "min_score": 14.60, "modules": ["Programming", "Algorithms", "Systems", "Databases"]},
                {"name": "Economics", "min_score": 13.20, "modules": ["Microeconomics", "Macroeconomics", "Statistics", "Public Finance"]},
                {"name": "Pharmacy", "min_score": 16.20, "modules": ["Pharmacology", "Medicinal Chemistry", "Toxicology", "Pharmaceutics"]},
            ],
        },
        {
            "name": "University of Bejaia",
            "description": "Abderrahmane Mira - Public university with diverse tracks",
            "min_score": 12.80,
            "type": "University",
            "city": "Bejaia",
            "gradient": "from-teal-500 to-blue-700",
            "icon": "🌊",
            "badge": "bg-teal-500/30",
            "specialities": [
                {"name": "Computer Science", "min_score": 14.30, "modules": ["Programming", "Databases", "Networks", "Web Technologies"]},
                {"name": "Finance", "min_score": 13.90, "modules": ["Financial Accounting", "Corporate Finance", "Banking", "Risk Analysis"]},
                {"name": "English Language and Literature", "min_score": 12.90, "modules": ["Linguistics", "Translation", "Literary Criticism", "Academic Writing"]},
                {"name": "Management", "min_score": 13.60, "modules": ["Organizational Behavior", "Project Management", "Strategy", "Operations"]},
                {"name": "Law", "min_score": 13.10, "modules": ["Legal Reasoning", "Civil Law", "Commercial Law", "Administrative Law"]},
            ],
        },
        {
            "name": "HEC Algiers",
            "description": "Higher School of Commerce",
            "min_score": 15.00,
            "type": "Grande Ecole",
            "city": "Algiers",
            "gradient": "from-cyan-500 to-cyan-700",
            "icon": "💼",
            "badge": "bg-cyan-500/30",
            "specialities": [
                {"name": "Finance", "min_score": 15.80, "modules": ["Corporate Finance", "Accounting", "Financial Analysis", "Risk Management"]},
                {"name": "Marketing", "min_score": 15.20, "modules": ["Consumer Behavior", "Digital Marketing", "Brand Strategy", "Market Research"]},
                {"name": "Management", "min_score": 15.00, "modules": ["Human Resources", "Business Strategy", "Operations", "Leadership"]},
            ],
        },
    ]

    for univ in data:
        existing_univ = conn.execute(
            "SELECT id FROM universities WHERE name = ?",
            (univ["name"],),
        ).fetchone()

        if existing_univ is None:
            cur = conn.execute(
                """
                INSERT INTO universities(name, description, min_score, type, city, gradient, icon, badge)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    univ["name"],
                    univ["description"],
                    univ["min_score"],
                    univ["type"],
                    univ["city"],
                    univ["gradient"],
                    univ["icon"],
                    univ["badge"],
                ),
            )
            univ_id = cur.lastrowid
        else:
            univ_id = existing_univ["id"]
            conn.execute(
                """
                UPDATE universities
                SET description = ?, min_score = ?, type = ?, city = ?, gradient = ?, icon = ?, badge = ?
                WHERE id = ?
                """,
                (
                    univ["description"],
                    univ["min_score"],
                    univ["type"],
                    univ["city"],
                    univ["gradient"],
                    univ["icon"],
                    univ["badge"],
                    univ_id,
                ),
            )

        for spec in univ["specialities"]:
            existing_spec = conn.execute(
                "SELECT id FROM specialities WHERE university_id = ? AND name = ?",
                (univ_id, spec["name"]),
            ).fetchone()

            if existing_spec is None:
                spec_cur = conn.execute(
                    """
                    INSERT INTO specialities(university_id, name, min_score)
                    VALUES (?, ?, ?)
                    """,
                    (univ_id, spec["name"], spec["min_score"]),
                )
                spec_id = spec_cur.lastrowid
            else:
                spec_id = existing_spec["id"]
                conn.execute(
                    "UPDATE specialities SET min_score = ? WHERE id = ?",
                    (spec["min_score"], spec_id),
                )

            for module in spec["modules"]:
                existing_module = conn.execute(
                    "SELECT id FROM modules WHERE speciality_id = ? AND name = ?",
                    (spec_id, module),
                ).fetchone()
                if existing_module is None:
                    conn.execute(
                        "INSERT INTO modules(speciality_id, name) VALUES (?, ?)",
                        (spec_id, module),
                    )


def seed_careers(conn: sqlite3.Connection) -> None:
    data = [
        {
            "title": "Software Engineering",
            "description": "Design and develop software applications and systems",
            "demand": "High Demand",
            "salary": "120K-250K DZD",
            "icon": "💻",
            "icon_bg": "bg-blue-500/20",
            "icon_ring": "ring-blue-400/25",
            "roadmap": ["Learn programming fundamentals", "Build web/mobile projects", "Practice with databases and APIs", "Apply for internships and junior roles"],
            "skills": ["Problem Solving", "JavaScript/TypeScript", "Databases", "System Design"],
            "opportunities": ["Backend Developer", "Frontend Developer", "Full-Stack Engineer", "QA Automation Engineer"],
        },
        {
            "title": "Medical Doctor",
            "description": "Diagnose and treat patients in hospitals and clinics",
            "demand": "Essential",
            "salary": "150K-300K DZD",
            "icon": "🏥",
            "icon_bg": "bg-green-500/20",
            "icon_ring": "ring-green-400/25",
            "roadmap": ["Complete pre-med foundation", "Study medicine and clinical rotations", "Pass residency entrance requirements", "Specialize and practice"],
            "skills": ["Clinical Reasoning", "Patient Care", "Communication", "Medical Ethics"],
            "opportunities": ["General Practitioner", "Hospital Resident", "Specialist Doctor", "Public Health Physician"],
        },
        {
            "title": "Electrical Engineer",
            "description": "Design electrical systems and power distribution",
            "demand": "Growing",
            "salary": "100K-200K DZD",
            "icon": "⚡",
            "icon_bg": "bg-purple-500/20",
            "icon_ring": "ring-purple-400/25",
            "roadmap": ["Master electrical fundamentals", "Study power/control systems", "Work on lab and field projects", "Join industry internships"],
            "skills": ["Circuit Analysis", "Control Systems", "Power Engineering", "Troubleshooting"],
            "opportunities": ["Power Engineer", "Automation Engineer", "Maintenance Engineer", "Embedded Systems Engineer"],
        },
        {
            "title": "Data Scientist",
            "description": "Analyze data and build predictive models",
            "demand": "Emerging",
            "salary": "130K-280K DZD",
            "icon": "📊",
            "icon_bg": "bg-orange-500/20",
            "icon_ring": "ring-orange-400/25",
            "roadmap": ["Learn statistics and Python", "Practice data cleaning and SQL", "Build machine learning models", "Create portfolio and deploy projects"],
            "skills": ["Statistics", "Python", "Machine Learning", "Data Visualization"],
            "opportunities": ["Data Analyst", "ML Engineer", "BI Analyst", "AI Research Assistant"],
        },
        {
            "title": "Civil Engineer",
            "description": "Design and oversee construction of infrastructure",
            "demand": "Stable",
            "salary": "90K-180K DZD",
            "icon": "🏗️",
            "icon_bg": "bg-cyan-500/20",
            "icon_ring": "ring-cyan-400/25",
            "roadmap": ["Study structural and geotechnical basics", "Learn CAD and project planning", "Gain site supervision experience", "Get certified and lead projects"],
            "skills": ["Structural Design", "AutoCAD", "Site Management", "Project Planning"],
            "opportunities": ["Site Engineer", "Structural Engineer", "Project Engineer", "Infrastructure Planner"],
        },
        {
            "title": "Business Manager",
            "description": "Lead teams and manage business operations",
            "demand": "High Demand",
            "salary": "110K-220K DZD",
            "icon": "💼",
            "icon_bg": "bg-red-500/20",
            "icon_ring": "ring-red-400/25",
            "roadmap": ["Learn business fundamentals", "Develop leadership and communication", "Practice with real case studies", "Grow into team/operations roles"],
            "skills": ["Leadership", "Decision Making", "Communication", "Strategic Planning"],
            "opportunities": ["Operations Manager", "Project Manager", "Sales Manager", "Business Consultant"],
        },
        {
            "title": "Lawyer",
            "description": "Represent clients, analyze legal issues, and draft legal documents",
            "demand": "High Demand",
            "salary": "100K-260K DZD",
            "icon": "⚖️",
            "icon_bg": "bg-amber-500/20",
            "icon_ring": "ring-amber-400/25",
            "roadmap": ["Build legal foundations", "Practice case analysis and legal writing", "Complete internships in legal offices", "Prepare for bar/professional track"],
            "skills": ["Legal Reasoning", "Argumentation", "Research", "Drafting"],
            "opportunities": ["Corporate Lawyer", "Legal Advisor", "Litigation Associate", "Public Administration"],
        },
        {
            "title": "Psychologist",
            "description": "Assess behavior and support mental health and learning outcomes",
            "demand": "Growing",
            "salary": "90K-190K DZD",
            "icon": "🧠",
            "icon_bg": "bg-fuchsia-500/20",
            "icon_ring": "ring-fuchsia-400/25",
            "roadmap": ["Study psychology foundations", "Train in assessment methods", "Gain supervised practice", "Specialize in clinical/educational tracks"],
            "skills": ["Active Listening", "Assessment", "Empathy", "Research Methods"],
            "opportunities": ["School Psychologist", "Counseling Assistant", "HR Behavioral Analyst", "Clinical Support"],
        },
        {
            "title": "Journalist",
            "description": "Research, verify, and communicate information through digital and traditional media",
            "demand": "Growing",
            "salary": "80K-170K DZD",
            "icon": "📰",
            "icon_bg": "bg-violet-500/20",
            "icon_ring": "ring-violet-400/25",
            "roadmap": ["Learn media writing and ethics", "Practice interviewing and fact-checking", "Build a publication portfolio", "Specialize in a reporting domain"],
            "skills": ["Writing", "Interviewing", "Fact-checking", "Storytelling"],
            "opportunities": ["Reporter", "Content Editor", "Digital Media Producer", "Communication Officer"],
        },
        {
            "title": "English Teacher",
            "description": "Teach language skills and communication in schools or institutes",
            "demand": "Stable",
            "salary": "80K-180K DZD",
            "icon": "🎓",
            "icon_bg": "bg-sky-500/20",
            "icon_ring": "ring-sky-400/25",
            "roadmap": ["Master language and literature", "Learn teaching methodologies", "Practice classroom delivery", "Prepare for certification and recruitment"],
            "skills": ["Pedagogy", "Communication", "Lesson Planning", "Assessment"],
            "opportunities": ["Secondary Teacher", "Language Center Instructor", "Curriculum Assistant", "Education Coordinator"],
        },
        {
            "title": "Pharmacist",
            "description": "Ensure safe medication use and provide patient counseling",
            "demand": "Essential",
            "salary": "130K-260K DZD",
            "icon": "💊",
            "icon_bg": "bg-lime-500/20",
            "icon_ring": "ring-lime-400/25",
            "roadmap": ["Complete pharmacy program", "Train in pharmacology and dispensing", "Develop clinical communication", "Enter hospital/community pharmacy"],
            "skills": ["Pharmacology", "Precision", "Patient Counseling", "Regulatory Awareness"],
            "opportunities": ["Community Pharmacist", "Hospital Pharmacist", "Regulatory Affairs", "Pharma Industry Associate"],
        },
    ]

    for career in data:
        existing_career = conn.execute(
            "SELECT id FROM careers WHERE title = ?",
            (career["title"],),
        ).fetchone()

        if existing_career is None:
            cur = conn.execute(
                """
                INSERT INTO careers(title, description, demand, salary, icon, icon_bg, icon_ring)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    career["title"],
                    career["description"],
                    career["demand"],
                    career["salary"],
                    career["icon"],
                    career["icon_bg"],
                    career["icon_ring"],
                ),
            )
            career_id = cur.lastrowid
        else:
            career_id = existing_career["id"]
            conn.execute(
                """
                UPDATE careers
                SET description = ?, demand = ?, salary = ?, icon = ?, icon_bg = ?, icon_ring = ?
                WHERE id = ?
                """,
                (
                    career["description"],
                    career["demand"],
                    career["salary"],
                    career["icon"],
                    career["icon_bg"],
                    career["icon_ring"],
                    career_id,
                ),
            )

        conn.execute("DELETE FROM career_roadmap WHERE career_id = ?", (career_id,))
        conn.execute("DELETE FROM career_skills WHERE career_id = ?", (career_id,))
        conn.execute("DELETE FROM career_opportunities WHERE career_id = ?", (career_id,))

        for order, step in enumerate(career["roadmap"], start=1):
            conn.execute(
                "INSERT INTO career_roadmap(career_id, step_order, step_text) VALUES (?, ?, ?)",
                (career_id, order, step),
            )

        for skill in career["skills"]:
            conn.execute(
                "INSERT INTO career_skills(career_id, skill) VALUES (?, ?)",
                (career_id, skill),
            )

        for opportunity in career["opportunities"]:
            conn.execute(
                "INSERT INTO career_opportunities(career_id, opportunity) VALUES (?, ?)",
                (career_id, opportunity),
            )


def init_db() -> None:
    with get_conn() as conn:
        init_schema(conn)
        seed_users(conn)
        seed_universities(conn)
        seed_careers(conn)
        conn.commit()


def university_to_dict(conn: sqlite3.Connection, row: sqlite3.Row):
    specs = conn.execute(
        "SELECT id, name, min_score FROM specialities WHERE university_id = ? ORDER BY id",
        (row["id"],),
    ).fetchall()

    specialities = []
    for spec in specs:
        modules = conn.execute(
            "SELECT name FROM modules WHERE speciality_id = ? ORDER BY id",
            (spec["id"],),
        ).fetchall()
        specialities.append(
            {
                "name": spec["name"],
                "minScore": f"{spec['min_score']:.2f}",
                "modules": [m["name"] for m in modules],
            }
        )

    return {
        "id": row["id"],
        "name": row["name"],
        "desc": row["description"],
        "score": f"{row['min_score']:.2f}",
        "type": row["type"],
        "city": row["city"],
        "gradient": row["gradient"],
        "icon": row["icon"],
        "badge": row["badge"],
        "specialities": specialities,
    }


def career_to_dict(conn: sqlite3.Connection, row: sqlite3.Row):
    roadmap = conn.execute(
        "SELECT step_text FROM career_roadmap WHERE career_id = ? ORDER BY step_order",
        (row["id"],),
    ).fetchall()
    skills = conn.execute(
        "SELECT skill FROM career_skills WHERE career_id = ? ORDER BY id",
        (row["id"],),
    ).fetchall()
    opportunities = conn.execute(
        "SELECT opportunity FROM career_opportunities WHERE career_id = ? ORDER BY id",
        (row["id"],),
    ).fetchall()

    return {
        "id": row["id"],
        "title": row["title"],
        "desc": row["description"],
        "demand": row["demand"],
        "salary": row["salary"],
        "icon": row["icon"],
        "iconBg": row["icon_bg"],
        "iconRing": row["icon_ring"],
        "roadmap": [r["step_text"] for r in roadmap],
        "skills": [s["skill"] for s in skills],
        "opportunities": [o["opportunity"] for o in opportunities],
    }


def get_authenticated_user(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1].strip()
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    normalized_email = normalize_email(email)

    with get_conn() as conn:
        user = conn.execute(
            "SELECT name, email, bac_stream, bac_average, math_grade, physics_grade, subject3_grade, wilaya FROM users WHERE lower(email) = ?",
            (normalized_email,),
        ).fetchone()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user


init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "EduPath API running"}


class User(BaseModel):
    name: str
    email: str
    password: str


class LoginData(BaseModel):
    email: str
    password: str


class ForgotPasswordData(BaseModel):
    email: str


class ResetPasswordData(BaseModel):
    token: str
    new_password: str


class ProfileUpdateData(BaseModel):
    bac_stream: str
    bac_average: float
    math_grade: float
    physics_grade: float
    subject3_grade: float
    wilaya: str


@app.post("/register")
def register(user: User):
    normalized_email = normalize_email(user.email)
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email is required")

    with get_conn() as conn:
        exists = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (normalized_email,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")

        conn.execute(
            """
            INSERT INTO users(name, email, password_hash, bac_stream, bac_average, math_grade, physics_grade, subject3_grade, wilaya)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user.name.strip(), normalized_email, hash_password(user.password), "Sciences", 0, 0, 0, 0, "Algiers"),
        )
        conn.commit()

    token = create_token(normalized_email)
    return {
        "message": "User created successfully",
        "token": token,
        "user": {
            "name": user.name.strip(),
            "email": normalized_email,
            "bac_stream": "Sciences",
        },
    }


@app.post("/login")
def login(data: LoginData):
    normalized_email = normalize_email(data.email)
    with get_conn() as conn:
        user = conn.execute(
            "SELECT name, email, bac_stream, password_hash FROM users WHERE lower(email) = ?",
            (normalized_email,),
        ).fetchone()

        if user and user["password_hash"] == hash_password(data.password):
            token = create_token(user["email"])
            return {
                "message": "Login successful",
                "token": token,
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "bac_stream": user["bac_stream"],
                },
            }

    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/forgot-password")
def forgot_password(data: ForgotPasswordData):
    normalized_email = normalize_email(data.email)
    now = int(time.time())
    expires_at = now + (15 * 60)

    with get_conn() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE lower(email) = ?",
            (normalized_email,),
        ).fetchone()

        if user is None:
            return {"message": "If this email exists, a reset link has been generated."}

        conn.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
            (now, user["id"]),
        )

        reset_token = secrets.token_urlsafe(24)
        conn.execute(
            """
            INSERT INTO password_reset_tokens(user_id, token, expires_at, used_at, created_at)
            VALUES (?, ?, ?, NULL, ?)
            """,
            (user["id"], reset_token, expires_at, now),
        )
        conn.commit()

    # Dev mode response so frontend can complete reset without email service.
    return {
        "message": "Reset token generated. Use it to set a new password.",
        "reset_token": reset_token,
        "expires_in_minutes": 15,
    }


@app.post("/reset-password")
def reset_password(data: ResetPasswordData):
    token = (data.token or "").strip()
    new_password = (data.new_password or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Reset token is required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    now = int(time.time())
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT prt.id AS token_id, prt.user_id AS user_id
            FROM password_reset_tokens prt
            WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at >= ?
            """,
            (token, now),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), row["user_id"]),
        )
        conn.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
            (now, row["token_id"]),
        )
        conn.commit()

    return {"message": "Password updated successfully"}


@app.get("/me")
def me(authorization: str | None = Header(default=None)):
    user = get_authenticated_user(authorization)
    return {
        "user": {
            "name": user["name"],
            "email": user["email"],
            "bac_stream": user["bac_stream"],
            "bac_average": user["bac_average"],
            "math_grade": user["math_grade"],
            "physics_grade": user["physics_grade"],
            "subject3_grade": user["subject3_grade"],
            "wilaya": user["wilaya"],
        }
    }


@app.put("/me/profile")
def update_profile(data: ProfileUpdateData, authorization: str | None = Header(default=None)):
    user = get_authenticated_user(authorization)

    with get_conn() as conn:
        conn.execute(
            """
            UPDATE users
            SET bac_stream = ?, bac_average = ?, math_grade = ?, physics_grade = ?, subject3_grade = ?, wilaya = ?
            WHERE email = ?
            """,
            (
                data.bac_stream,
                data.bac_average,
                data.math_grade,
                data.physics_grade,
                data.subject3_grade,
                data.wilaya,
                user["email"],
            ),
        )
        conn.commit()

        refreshed = conn.execute(
            "SELECT name, email, bac_stream, bac_average, math_grade, physics_grade, subject3_grade, wilaya FROM users WHERE email = ?",
            (user["email"],),
        ).fetchone()

    return {
        "message": "Profile updated",
        "user": {
            "name": refreshed["name"],
            "email": refreshed["email"],
            "bac_stream": refreshed["bac_stream"],
            "bac_average": refreshed["bac_average"],
            "math_grade": refreshed["math_grade"],
            "physics_grade": refreshed["physics_grade"],
            "subject3_grade": refreshed["subject3_grade"],
            "wilaya": refreshed["wilaya"],
        },
    }


@app.get("/universities")
def list_universities():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM universities ORDER BY id").fetchall()
        return [university_to_dict(conn, row) for row in rows]


@app.get("/universities/{university_id}")
def get_university(university_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM universities WHERE id = ?", (university_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="University not found")
        return university_to_dict(conn, row)


@app.get("/careers")
def list_careers():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM careers ORDER BY id").fetchall()
        return [career_to_dict(conn, row) for row in rows]


@app.get("/careers/{career_id}")
def get_career(career_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM careers WHERE id = ?", (career_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Career not found")
        return career_to_dict(conn, row)
