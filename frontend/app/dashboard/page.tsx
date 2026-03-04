"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { AssessmentContent } from "@/app/components/assessment-content";
import { api, clearToken, getToken } from "@/lib/api";

const WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Bejaia", "Biskra", "Bechar", "Blida", "Bouira",
  "Tamanrasset", "Tebessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Algiers", "Djelfa", "Jijel", "Setif", "Saida",
  "Skikda", "Sidi Bel Abbes", "Annaba", "Guelma", "Constantine", "Medea", "Mostaganem", "M'Sila", "Mascara", "Ouargla",
  "Oran", "El Bayadh", "Illizi", "Bordj Bou Arreridj", "Boumerdes", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
  "Souk Ahras", "Tipaza", "Mila", "Ain Defla", "Naama", "Ain Temouchent", "Ghardaia", "Relizane",
];

function getBranchSubjectConfig(stream: string) {
  const s = (stream || "").toLowerCase();
  if (s.includes("lettres") || s.includes("philo")) {
    return {
      subject1Label: "Literature Grade",
      subject2Label: "Philosophy Grade",
      subject3Label: "History-Geography Grade",
      subject1Hint: "Key subject for this BAC branch",
      subject2Hint: "Key subject for this BAC branch",
      subject3Hint: "Supporting subject for this BAC branch",
    };
  }
  if (s.includes("technique")) {
    return {
      subject1Label: "Technical Science Grade",
      subject2Label: "Physics Grade",
      subject3Label: "Mathematics Grade",
      subject1Hint: "Main technical module for this branch",
      subject2Hint: "Main scientific module for this branch",
      subject3Hint: "Supporting quantitative module",
    };
  }
  if (s.includes("science") && !s.includes("math")) {
    return {
      subject1Label: "Biology Grade",
      subject2Label: "Physics Grade",
      subject3Label: "Chemistry Grade",
      subject1Hint: "Core science subject for this branch",
      subject2Hint: "Core science subject for this branch",
      subject3Hint: "Core science subject for this branch",
    };
  }
  if (s.includes("gestion") || s.includes("economie") || s.includes("commerce")) {
    return {
      subject1Label: "Economics Grade",
      subject2Label: "Management Grade",
      subject3Label: "Mathematics Grade",
      subject1Hint: "Core domain subject",
      subject2Hint: "Core domain subject",
      subject3Hint: "Supporting quantitative subject",
    };
  }
  return {
    subject1Label: "Mathematics Grade",
    subject2Label: "Physics Grade",
    subject3Label: "Natural Science Grade",
    subject1Hint: "Core quantitative subject",
    subject2Hint: "Core scientific subject",
    subject3Hint: "Supporting scientific subject",
  };
}

function normalizeBacStream(stream: string) {
  const raw = (stream || "").trim();
  const s = raw.toLowerCase();
  if (!raw) return "Sciences";
  if (s.includes("sciences experimentales")) return "Sciences";
  return raw;
}

type SpecialityTrack = "Computing" | "Engineering" | "Health" | "Business" | "Humanities" | "SocialLaw" | "Other";

function getSpecialityTrack(name: string): SpecialityTrack {
  const n = (name || "").toLowerCase();
  if (n.includes("computer") || n.includes("software") || n.includes("ai") || n.includes("data") || n.includes("cyber")) return "Computing";
  if (
    n.includes("electrical") ||
    n.includes("electronics") ||
    n.includes("telecom") ||
    n.includes("mechanical") ||
    n.includes("industrial") ||
    n.includes("civil") ||
    n.includes("chemical")
  ) return "Engineering";
  if (n.includes("medicine") || n.includes("pharmacy") || n.includes("dentistry") || n.includes("biotech")) return "Health";
  if (n.includes("finance") || n.includes("marketing") || n.includes("management") || n.includes("commerce") || n.includes("economics")) return "Business";
  if (
    n.includes("literature") ||
    n.includes("language") ||
    n.includes("translation") ||
    n.includes("philosophy") ||
    n.includes("history") ||
    n.includes("communication") ||
    n.includes("journalism")
  ) return "Humanities";
  if (n.includes("law") || n.includes("droit") || n.includes("sociology") || n.includes("psychology") || n.includes("political")) return "SocialLaw";
  return "Other";
}

function recommendationVisual(track: SpecialityTrack): { gradient: string; icon: string; area: string } {
  if (track === "Computing") return { gradient: "from-blue-600/40 to-blue-800/30", icon: "💻", area: "Engineering & Computing" };
  if (track === "Engineering") return { gradient: "from-indigo-600/40 to-indigo-800/30", icon: "⚙️", area: "Engineering" };
  if (track === "Health") return { gradient: "from-green-600/40 to-green-800/30", icon: "🏥", area: "Health Sciences" };
  if (track === "Business") return { gradient: "from-cyan-600/40 to-cyan-800/30", icon: "💼", area: "Business & Economics" };
  if (track === "Humanities") return { gradient: "from-violet-600/40 to-violet-800/30", icon: "📚", area: "Humanities" };
  if (track === "SocialLaw") return { gradient: "from-amber-600/40 to-amber-800/30", icon: "⚖️", area: "Law & Social Sciences" };
  return { gradient: "from-slate-600/40 to-slate-800/30", icon: "🎓", area: "General Studies" };
}

function inferUniversityField(univ: UniversityCard): "Engineering" | "Medicine" | "Business" | "Other" {
  const text = `${univ.name} ${univ.desc} ${univ.specialities.map((s) => s.name).join(" ")}`.toLowerCase();
  if (text.includes("medicine") || text.includes("pharmacy") || text.includes("dentistry")) return "Medicine";
  if (text.includes("commerce") || text.includes("business") || text.includes("finance") || text.includes("marketing")) return "Business";
  if (text.includes("engineering") || text.includes("computer") || text.includes("science")) return "Engineering";
  return "Other";
}

function DashboardHome({
  goSection,
  userName,
  profileCompletion,
  bacAverage,
  universitiesMatched,
  suggestedSpecialities,
}: {
  goSection: (section: string) => void;
  userName: string;
  profileCompletion: number;
  bacAverage: number;
  universitiesMatched: number;
  suggestedSpecialities: Array<{
    label: string;
    university: string;
    minScore: number;
    fit: number;
    reason: string;
    scoreDetails: string[];
  }>;
}) {
  const aiTopCards = suggestedSpecialities.slice(0, 3).map((item) => {
    const visual = recommendationVisual(getSpecialityTrack(item.label));
    return {
      title: `${item.university} - ${item.label}`,
      subtitle: `${item.university} - ${visual.area}`,
      match: `${item.fit}% Match`,
      gradient: visual.gradient,
      icon: visual.icon,
      reason: item.reason,
    };
  });

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Welcome back, {userName}!</h1>
          <p className="text-blue-300">Let&apos;s find your perfect university path</p>
        </div>
        <button className="glass-panel relative rounded-2xl p-3">
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          [`${profileCompletion}%`, "Profile Complete", profileCompletion > 0 ? "+progress" : "Start", "bg-blue-500/20", "text-blue-300", "\u{2705}"],
          [`${universitiesMatched}`, "Universities Matched", universitiesMatched > 0 ? "Ready" : "New", "bg-green-500/20", "text-green-400", "\u{1F3EB}"],
          [bacAverage.toFixed(2), "BAC Average", bacAverage > 0 ? "Updated" : "Pending", "bg-purple-500/20", "text-purple-300", "\u{1F4C8}"],
          ["0", "Days to Deadline", "Soon", "bg-orange-500/20", "text-orange-300", "\u{23F0}"],
        ].map(([v, l, t, iconBg, trendColor, sticker]) => (
          <div key={l} className="stat-card glass-panel card-hover rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl shadow-[0_8px_18px_rgba(15,31,63,0.35)] ring-1 ring-white/10 ${iconBg}`}>
                <span>{sticker}</span>
              </div>
              <span className={`text-sm font-medium ${trendColor}`}>{t}</span>
            </div>
            <h3 className="mb-1 text-3xl font-bold">{v}</h3>
            <p className="text-2xl text-blue-300">{l}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-xl shadow-[0_6px_16px_rgba(44,115,255,0.35)]">
            <span>{"\u{1F4A1}"}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Recommendations</h2>
            <p className="text-base text-blue-300">Based on your profile and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {aiTopCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-200 md:col-span-3">
              Complete your profile to unlock AI recommendations tailored to your BAC branch and grades.
            </div>
          ) : aiTopCards.map((card) => (
            <button key={card.title} onClick={() => goSection("universities")} className={`card-hover rounded-2xl border border-white/10 bg-gradient-to-br ${card.gradient} p-5 text-left`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-lg ring-1 ring-white/20">
                  <span>{card.icon}</span>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{card.match}</span>
              </div>
              <h3 className="text-xl font-bold">{card.title}</h3>
              <p className="text-base text-blue-200">{card.subtitle}</p>
              <p className="mt-2 text-xs text-blue-200">{card.reason}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Suggested Specialities</h2>
            <p className="text-base text-blue-300">Based on your BAC profile and subject grades</p>
          </div>
          <button onClick={() => goSection("universities")} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20">
            Explore all
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {suggestedSpecialities.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-200 md:col-span-3">
              Add your BAC average and grades in Profile to unlock speciality suggestions.
            </div>
          ) : (
            suggestedSpecialities.map((item) => (
              <button
                key={`${item.university}-${item.label}`}
                onClick={() => goSection("universities")}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
              >
                <p className="text-lg font-semibold">{item.label}</p>
                <p className="text-sm text-blue-300">{item.university}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-white/10 px-2 py-1 text-blue-200">Min {item.minScore.toFixed(2)}</span>
                  <span className="rounded-full bg-cyan-500/20 px-2 py-1 text-cyan-200">Fit {item.fit}%</span>
                </div>
                <p className="mt-2 text-xs text-blue-300">{item.reason}</p>
                {item.scoreDetails.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.scoreDetails.slice(0, 3).map((detail) => (
                      <span key={detail} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-blue-200">
                        {detail}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="mb-4 text-lg font-bold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => goSection("assessment")} className="rounded-xl bg-blue-500/20 p-4 text-left transition hover:bg-blue-500/30">Take Assessment</button>
            <button onClick={() => goSection("universities")} className="rounded-xl bg-purple-500/20 p-4 text-left transition hover:bg-purple-500/30">Explore Universities</button>
            <button onClick={() => goSection("comparison")} className="rounded-xl bg-green-500/20 p-4 text-left transition hover:bg-green-500/30">Compare Programs</button>
            <button onClick={() => goSection("profile")} className="rounded-xl bg-orange-500/20 p-4 text-left transition hover:bg-orange-500/30">Update Profile</button>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="mb-4 text-lg font-bold">Orientation Timeline</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>BAC Results Released</span><span className="text-green-400">Completed</span></div>
            <div className="flex justify-between"><span>Pre-inscription Period</span><span className="text-blue-400">Active</span></div>
            <div className="flex justify-between"><span>Final Results</span><span className="text-white/60">Upcoming</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

type UniversitySpeciality = {
  name: string;
  minScore: string;
  modules: string[];
};

type UniversityCard = {
  name: string;
  desc: string;
  score: string;
  type: string;
  city: string;
  gradient: string;
  icon: string;
  badge: string;
  specialities: UniversitySpeciality[];
};

const universityCards: UniversityCard[] = [
  {
    name: "USTHB",
    desc: "University of Science and Technology Houari Boumediene",
    score: "14.50",
    type: "Grande Ecole",
    city: "Algiers",
    gradient: "from-blue-500 to-blue-700",
    icon: "🏛️",
    badge: "bg-blue-500/30",
    specialities: [
      { name: "Computer Science", minScore: "16.00", modules: ["Algorithms", "Data Structures", "Operating Systems", "Databases"] },
      { name: "Telecommunications", minScore: "15.20", modules: ["Signals", "Network Protocols", "Wireless Systems", "Digital Communications"] },
      { name: "Chemical Engineering", minScore: "14.50", modules: ["Thermodynamics", "Process Control", "Industrial Chemistry", "Fluid Mechanics"] },
    ],
  },
  {
    name: "University of Algiers 1",
    desc: "Faculty of Medicine - Benyoucef Benkhedda",
    score: "16.00",
    type: "University",
    city: "Algiers",
    gradient: "from-green-500 to-green-700",
    icon: "🏥",
    badge: "bg-green-500/30",
    specialities: [
      { name: "Medicine", minScore: "17.00", modules: ["Anatomy", "Physiology", "Biochemistry", "Clinical Skills"] },
      { name: "Pharmacy", minScore: "16.50", modules: ["Pharmacology", "Medicinal Chemistry", "Pharmaceutics", "Toxicology"] },
      { name: "Dentistry", minScore: "16.30", modules: ["Oral Anatomy", "Dental Materials", "Oral Pathology", "Prosthodontics"] },
    ],
  },
  {
    name: "ENP",
    desc: "National Polytechnic School - Engineering",
    score: "17.00",
    type: "Grande Ecole",
    city: "Algiers",
    gradient: "from-purple-500 to-purple-700",
    icon: "⚡",
    badge: "bg-purple-500/30",
    specialities: [
      { name: "Electrical Engineering", minScore: "17.00", modules: ["Circuit Theory", "Power Systems", "Control Systems", "Electrical Machines"] },
      { name: "Mechanical Engineering", minScore: "16.70", modules: ["Statics", "Dynamics", "Thermal Systems", "Manufacturing"] },
      { name: "Industrial Engineering", minScore: "16.40", modules: ["Operations Research", "Quality Control", "Supply Chain", "Project Planning"] },
    ],
  },
  {
    name: "ESI",
    desc: "Higher School of Computer Science",
    score: "16.50",
    type: "Grande Ecole",
    city: "Algiers",
    gradient: "from-orange-500 to-orange-700",
    icon: "💻",
    badge: "bg-orange-500/30",
    specialities: [
      { name: "Software Engineering", minScore: "16.80", modules: ["Software Design", "Web Development", "Testing", "DevOps"] },
      { name: "AI & Data Science", minScore: "16.90", modules: ["Machine Learning", "Statistics", "Data Mining", "Deep Learning"] },
      { name: "Cybersecurity", minScore: "16.50", modules: ["Network Security", "Cryptography", "Ethical Hacking", "Security Auditing"] },
    ],
  },
  {
    name: "USTO-MB",
    desc: "University of Science and Technology - Mohamed Boudiaf",
    score: "13.50",
    type: "University",
    city: "Oran",
    gradient: "from-red-500 to-red-700",
    icon: "🔬",
    badge: "bg-red-500/30",
    specialities: [
      { name: "Civil Engineering", minScore: "14.20", modules: ["Structural Analysis", "Concrete Design", "Geotechnics", "Hydraulics"] },
      { name: "Electronics", minScore: "14.00", modules: ["Analog Electronics", "Digital Systems", "Embedded Systems", "Instrumentation"] },
      { name: "Biotechnology", minScore: "13.50", modules: ["Cell Biology", "Genetics", "Bioprocessing", "Molecular Biology"] },
    ],
  },
  {
    name: "University of Algiers 2",
    desc: "Faculty of Humanities and Social Sciences",
    score: "12.40",
    type: "University",
    city: "Algiers",
    gradient: "from-indigo-500 to-blue-700",
    icon: "📚",
    badge: "bg-indigo-500/30",
    specialities: [
      { name: "Law", minScore: "13.50", modules: ["Constitutional Law", "Civil Law", "Administrative Law", "Legal Methodology"] },
      { name: "Psychology", minScore: "12.80", modules: ["General Psychology", "Cognitive Psychology", "Psychometrics", "Research Methods"] },
      { name: "Sociology", minScore: "12.60", modules: ["Social Theory", "Sociological Methods", "Demography", "Field Research"] },
      { name: "English Language and Literature", minScore: "12.50", modules: ["Linguistics", "Literary Analysis", "Academic Writing", "Translation"] },
      { name: "Media and Communication", minScore: "12.90", modules: ["Media Studies", "Public Speaking", "Digital Communication", "Content Strategy"] },
      { name: "Philosophy", minScore: "12.40", modules: ["Logic", "Ethics", "History of Philosophy", "Critical Thinking"] },
    ],
  },
  {
    name: "University of Algiers 1 - Faculty of Sciences",
    desc: "Benyoucef Benkhedda - Faculty of Sciences",
    score: "13.80",
    type: "University",
    city: "Algiers",
    gradient: "from-sky-500 to-blue-700",
    icon: "🧪",
    badge: "bg-sky-500/30",
    specialities: [
      { name: "Computer Science", minScore: "15.50", modules: ["Algorithms", "Programming", "Databases", "Operating Systems"] },
      { name: "Mathematics", minScore: "14.60", modules: ["Analysis", "Algebra", "Probability", "Numerical Methods"] },
      { name: "Physics", minScore: "14.20", modules: ["Mechanics", "Electromagnetism", "Thermodynamics", "Optics"] },
      { name: "Chemistry", minScore: "13.90", modules: ["Organic Chemistry", "Analytical Chemistry", "Physical Chemistry", "Lab Methods"] },
      { name: "Biology", minScore: "13.80", modules: ["Cell Biology", "Genetics", "Biochemistry", "Microbiology"] },
    ],
  },
  {
    name: "University of Oran 1",
    desc: "Ahmed Ben Bella - Major multidisciplinary university",
    score: "13.20",
    type: "University",
    city: "Oran",
    gradient: "from-emerald-500 to-teal-700",
    icon: "🏙️",
    badge: "bg-emerald-500/30",
    specialities: [
      { name: "Computer Science", minScore: "14.80", modules: ["Programming", "Software Engineering", "Networks", "Databases"] },
      { name: "Economics", minScore: "13.50", modules: ["Microeconomics", "Macroeconomics", "Econometrics", "Public Economics"] },
      { name: "Law", minScore: "13.30", modules: ["Civil Law", "Criminal Law", "Administrative Law", "Legal Writing"] },
      { name: "English Language and Literature", minScore: "13.20", modules: ["Linguistics", "Literary Studies", "Translation", "Academic Communication"] },
    ],
  },
  {
    name: "University of Constantine 1",
    desc: "Freres Mentouri - Sciences, engineering, and humanities",
    score: "13.70",
    type: "University",
    city: "Constantine",
    gradient: "from-indigo-500 to-cyan-700",
    icon: "🏛️",
    badge: "bg-indigo-500/30",
    specialities: [
      { name: "Computer Science", minScore: "15.20", modules: ["Algorithms", "Software Engineering", "AI Basics", "Databases"] },
      { name: "Civil Engineering", minScore: "14.40", modules: ["Structural Mechanics", "Geotechnics", "Hydraulics", "Construction Materials"] },
      { name: "Psychology", minScore: "13.40", modules: ["General Psychology", "Developmental Psychology", "Psychometrics", "Counseling Basics"] },
      { name: "Law", minScore: "13.60", modules: ["Constitutional Law", "Civil Law", "Criminal Law", "Legal Methodology"] },
    ],
  },
  {
    name: "University of Blida 1",
    desc: "Saad Dahlab - Science and applied fields",
    score: "13.00",
    type: "University",
    city: "Blida",
    gradient: "from-rose-500 to-fuchsia-700",
    icon: "🔭",
    badge: "bg-rose-500/30",
    specialities: [
      { name: "Biotechnology", minScore: "13.80", modules: ["Molecular Biology", "Genetics", "Bioprocess Engineering", "Bioinformatics"] },
      { name: "Computer Science", minScore: "14.60", modules: ["Programming", "Algorithms", "Systems", "Databases"] },
      { name: "Economics", minScore: "13.20", modules: ["Microeconomics", "Macroeconomics", "Statistics", "Public Finance"] },
      { name: "Pharmacy", minScore: "16.20", modules: ["Pharmacology", "Medicinal Chemistry", "Toxicology", "Pharmaceutics"] },
    ],
  },
  {
    name: "University of Bejaia",
    desc: "Abderrahmane Mira - Public university with diverse tracks",
    score: "12.80",
    type: "University",
    city: "Bejaia",
    gradient: "from-teal-500 to-blue-700",
    icon: "🌊",
    badge: "bg-teal-500/30",
    specialities: [
      { name: "Computer Science", minScore: "14.30", modules: ["Programming", "Databases", "Networks", "Web Technologies"] },
      { name: "Finance", minScore: "13.90", modules: ["Financial Accounting", "Corporate Finance", "Banking", "Risk Analysis"] },
      { name: "English Language and Literature", minScore: "12.90", modules: ["Linguistics", "Translation", "Literary Criticism", "Academic Writing"] },
      { name: "Management", minScore: "13.60", modules: ["Organizational Behavior", "Project Management", "Strategy", "Operations"] },
      { name: "Law", minScore: "13.10", modules: ["Legal Reasoning", "Civil Law", "Commercial Law", "Administrative Law"] },
    ],
  },
  {
    name: "HEC Algiers",
    desc: "Higher School of Commerce",
    score: "15.00",
    type: "Grande Ecole",
    city: "Algiers",
    gradient: "from-cyan-500 to-cyan-700",
    icon: "💼",
    badge: "bg-cyan-500/30",
    specialities: [
      { name: "Finance", minScore: "15.80", modules: ["Corporate Finance", "Accounting", "Financial Analysis", "Risk Management"] },
      { name: "Marketing", minScore: "15.20", modules: ["Consumer Behavior", "Digital Marketing", "Brand Strategy", "Market Research"] },
      { name: "Management", minScore: "15.00", modules: ["Human Resources", "Business Strategy", "Operations", "Leadership"] },
    ],
  },
];

function suggestSpecialitiesForStudent({
  bacAverage,
  mathGrade,
  physicsGrade,
  subject3Grade,
  bacStream,
  wilaya,
}: {
  bacAverage: number;
  mathGrade: number;
  physicsGrade: number;
  subject3Grade: number;
  bacStream: string;
  wilaya: string;
}) {
  if (bacAverage <= 0) {
    return [] as Array<{
      label: string;
      university: string;
      minScore: number;
      fit: number;
      reason: string;
      scoreDetails: string[];
    }>;
  }

  const stream = normalizeBacStream(bacStream).toLowerCase();
  const isMath = stream.includes("math");
  const isExperimentalScience = stream.includes("science") && !isMath;
  const isScience = stream.includes("science") || isMath || isExperimentalScience;
  const isTech = stream.includes("technique");
  const isBusiness = stream.includes("gestion") || stream.includes("economie") || stream.includes("commerce");
  const isHumanities = stream.includes("lettres") || stream.includes("philo");
  const branchConfig = getBranchSubjectConfig(bacStream);
  const subject1Grade = Number(mathGrade || 0);
  const subject2Grade = Number(physicsGrade || 0);
  const subject3 = Number(subject3Grade || 0);
  const userWilaya = (wilaya || "").trim().toLowerCase();

  function cityProximityBoost(universityCity: string) {
    const city = (universityCity || "").trim().toLowerCase();
    if (!userWilaya || !city) return { fit: 0, priority: 0, detail: "" };
    if (userWilaya === city) return { fit: 10, priority: 18, detail: "+10 same city priority" };
    if (
      (userWilaya === "algiers" && city === "blida") ||
      (userWilaya === "blida" && city === "algiers")
    ) {
      return { fit: 6, priority: 10, detail: "+6 nearby city priority" };
    }
    if (
      (userWilaya === "bejaia" && (city === "setif" || city === "jijel")) ||
      ((userWilaya === "setif" || userWilaya === "jijel") && city === "bejaia")
    ) {
      return { fit: 4, priority: 6, detail: "+4 regional proximity" };
    }
    return { fit: 0, priority: 0, detail: "" };
  }

  const candidates = universityCards.flatMap((univ) =>
    univ.specialities
      .map((sp) => {
      const min = Number(sp.minScore);
      const gap = bacAverage - min;
      let fit = 66 + gap * 10;
      let reason = gap >= 0 ? "Your BAC is above this speciality threshold." : "Close to threshold; improve key modules to maximize your chance.";
      const details: string[] = [];

      if (gap >= 0) details.push(`+${Math.round(gap * 10)} BAC gap`);
      else details.push(`${Math.round(gap * 10)} BAC gap`);

      const track = getSpecialityTrack(sp.name);
      const isComputing = track === "Computing";
      const isEngineering = track === "Engineering";
      const isHealth = track === "Health";
      const isMgmt = track === "Business";
      const isHumanitiesTrack = track === "Humanities" || track === "SocialLaw";
      const lname = sp.name.toLowerCase();
      const isCivilLike = lname.includes("civil") || lname.includes("chemical");
      const isElectroLike = lname.includes("electronics") || lname.includes("electrical") || lname.includes("telecom");
      const hasStrongMathPhysics = subject1Grade >= 14 && subject2Grade >= 14;
      let sortPriority = 0;
      const cityBoost = cityProximityBoost(univ.city);
      if (cityBoost.fit !== 0) {
        fit += cityBoost.fit;
        sortPriority += cityBoost.priority;
        if (cityBoost.detail) details.push(cityBoost.detail);
      }

      if (isComputing) {
        const mathBoost = Math.max(0, subject1Grade - 10) * 1.8;
        const supportBoost = Math.max(0, subject3 - 10) * 0.8;
        fit += mathBoost;
        fit += supportBoost;
        if (mathBoost > 0) details.push(`+${Math.round(mathBoost)} ${branchConfig.subject1Label.toLowerCase()}`);
        if (supportBoost > 0) details.push(`+${Math.round(supportBoost)} ${branchConfig.subject3Label.toLowerCase()}`);
        if (isMath) {
          fit += 12;
          details.push("+12 branch match");
        } else if (isScience || isTech) {
          fit += 7;
          details.push("+7 branch support");
        } else if (isHumanities) {
          fit -= 12;
          details.push("-12 branch mismatch");
        }
        reason = isHumanities
          ? "This path is math-intensive; your BAC branch may require extra preparation."
          : "Good match when logic and quantitative foundations are strong.";
        if (isMath) {
          const mathStreamBonus = hasStrongMathPhysics ? 12 : 8;
          fit += mathStreamBonus;
          sortPriority += 40;
          details.push(`+${mathStreamBonus} maths->computing priority`);
          reason = "Top match for Mathematics BAC with strong logic and quantitative profile.";
        }
      } else if (isEngineering) {
        const physicsBoost = Math.max(0, subject2Grade - 10) * 1.8;
        const mathBoost = Math.max(0, subject1Grade - 10) * 1.2;
        const supportBoost = Math.max(0, subject3 - 10) * 0.8;
        fit += physicsBoost + mathBoost + supportBoost;
        if (physicsBoost > 0) details.push(`+${Math.round(physicsBoost)} ${branchConfig.subject2Label.toLowerCase()}`);
        if (mathBoost > 0) details.push(`+${Math.round(mathBoost)} ${branchConfig.subject1Label.toLowerCase()}`);
        if (supportBoost > 0) details.push(`+${Math.round(supportBoost)} ${branchConfig.subject3Label.toLowerCase()}`);
        if (isMath || isTech) {
          fit += 12;
          details.push("+12 branch match");
        } else if (isScience) {
          fit += 7;
          details.push("+7 branch support");
        } else if (isHumanities) {
          fit -= 14;
          details.push("-14 branch mismatch");
        }
        reason = isHumanities
          ? "Engineering relies heavily on math/physics; this is a stretch option from your branch."
          : "Strong fit when math and physics are consistent.";
        if (isMath && hasStrongMathPhysics) {
          if (isCivilLike) {
            fit -= 6;
            sortPriority -= 10;
            details.push("-6 lower priority than computing for math stream");
          } else if (isElectroLike) {
            fit += 2;
            sortPriority += 8;
            details.push("+2 strong technical fit");
          }
        }
      } else if (isHealth) {
        const bacBoost = Math.max(0, bacAverage - 13) * 1.8;
        const scienceBoost = Math.max(0, subject3 - 10) * 1.2;
        fit += bacBoost;
        fit += scienceBoost;
        if (bacBoost > 0) details.push(`+${Math.round(bacBoost)} BAC strength`);
        if (scienceBoost > 0) details.push(`+${Math.round(scienceBoost)} ${branchConfig.subject3Label.toLowerCase()}`);
        if (isExperimentalScience) {
          fit += 12;
          details.push("+12 branch match");
        } else if (isScience) {
          fit += 8;
          details.push("+8 branch support");
        } else if (isHumanities) {
          fit -= 14;
          details.push("-14 branch mismatch");
        }
        reason = isHumanities
          ? "Health studies are science-heavy; this choice may require a bridging effort."
          : "Best aligned with science-oriented BAC backgrounds.";
      } else if (isMgmt) {
        const bacBoost = Math.max(0, bacAverage - 11.5) * 1.4;
        const subjectBoost =
          Math.max(0, subject1Grade - 10) * 1.1 +
          Math.max(0, subject2Grade - 10) * 1.1 +
          Math.max(0, subject3 - 10) * 0.8;
        fit += bacBoost;
        fit += subjectBoost;
        if (bacBoost > 0) details.push(`+${Math.round(bacBoost)} BAC strength`);
        if (subjectBoost > 0) details.push(`+${Math.round(subjectBoost)} core subjects`);
        if (isBusiness) {
          fit += 12;
          details.push("+12 branch match");
        } else if (isHumanities) {
          fit += 8;
          details.push("+8 branch support");
        } else {
          fit += 4;
          details.push("+4 broad compatibility");
        }
        reason = isHumanities || isBusiness
          ? "This speciality aligns well with communication, analysis, and social reasoning."
          : "Balanced option with broad employability.";
      } else if (isHumanitiesTrack) {
        const subjectBoost =
          Math.max(0, subject1Grade - 10) * 1.4 +
          Math.max(0, subject2Grade - 10) * 1.3 +
          Math.max(0, subject3 - 10) * 1.1;
        fit += subjectBoost;
        if (subjectBoost > 0) details.push(`+${Math.round(subjectBoost)} humanities strengths`);
        if (isHumanities) {
          fit += 12;
          details.push("+12 branch match");
        } else if (isBusiness) {
          fit += 6;
          details.push("+6 branch support");
        } else {
          fit += 2;
          details.push("+2 broad compatibility");
        }
        reason = isHumanities
          ? "Strong alignment with your BAC branch and communication/analysis profile."
          : "This speciality is possible with strong language and analytical skills.";
      }

      if (gap < -1.0) {
        fit -= 14;
        details.push("-14 below threshold");
      }
      if (gap > 1.2) {
        fit += 4;
        details.push("+4 margin safety");
      }

      // Keep realism for branch-speciality mismatch even with high BAC.
      if (isHumanities && (isComputing || isEngineering || isHealth)) {
        if (bacAverage < 17.5) {
          return null;
        }
        fit -= 22;
        fit = Math.min(fit, 64);
        details.push("reorientation required");
        reason = "This path is outside your BAC branch and usually requires formal reorientation/bridging.";
      }

      fit = Math.max(35, Math.min(99, Math.round(fit)));

      return {
        label: sp.name,
        university: univ.name,
        minScore: min,
        fit,
        reason,
        scoreDetails: details,
        _priority: sortPriority,
        _gap: gap,
      };
      })
      .filter((item): item is { label: string; university: string; minScore: number; fit: number; reason: string; scoreDetails: string[]; _priority: number; _gap: number } => item !== null),
  );

  return candidates
    .sort((a, b) => {
      if (b.fit !== a.fit) return b.fit - a.fit;
      if (b._priority !== a._priority) return b._priority - a._priority;
      if (b._gap !== a._gap) return b._gap - a._gap;
      return a.minScore - b.minScore;
    })
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      university: item.university,
      minScore: item.minScore,
      fit: item.fit,
      reason: item.reason,
      scoreDetails: item.scoreDetails,
    }));
}

function UniversitiesSection() {
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [universities, setUniversities] = useState<UniversityCard[]>(universityCards);
  const [wilayaFilter, setWilayaFilter] = useState("All Wilayas");
  const [fieldFilter, setFieldFilter] = useState("All Fields");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [minBacFilter, setMinBacFilter] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityCard | null>(null);

  useEffect(() => {
    let active = true;
    api("/universities")
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setUniversities(data as UniversityCard[]);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedUniversity && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedUniversity]);

  const filteredUniversities = useMemo(() => {
    return universities.filter((univ) => {
      if (wilayaFilter !== "All Wilayas" && univ.city !== wilayaFilter) return false;
      if (fieldFilter !== "All Fields" && inferUniversityField(univ) !== fieldFilter) return false;
      if (typeFilter !== "All Types" && univ.type !== typeFilter) return false;

      const minBac = Number(minBacFilter);
      if (!Number.isNaN(minBac) && minBacFilter.trim() !== "" && Number(univ.score) < minBac) return false;

      return true;
    });
  }, [universities, wilayaFilter, fieldFilter, typeFilter, minBacFilter]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">University Explorer</h1>
        <p className="text-blue-300">Browse and filter universities across Algeria</p>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-blue-200">Wilaya</label>
            <select
              value={wilayaFilter}
              onChange={(e) => setWilayaFilter(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white"
            >
              <option style={{ color: "#0b1d33", backgroundColor: "#ffffff" }}>All Wilayas</option>
              {WILAYAS.map((wilaya) => (
                <option key={wilaya} style={{ color: "#0b1d33", backgroundColor: "#ffffff" }}>
                  {wilaya}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-blue-200">Field of Study</label>
            <select
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white"
            >
              <option>All Fields</option>
              <option>Engineering</option>
              <option>Medicine</option>
              <option>Business</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-blue-200">Institution Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white"
            >
              <option>All Types</option>
              <option>University</option>
              <option>Grande Ecole</option>
              <option>Institute</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-blue-200">Min. BAC Score</label>
            <input
              type="number"
              value={minBacFilter}
              onChange={(e) => setMinBacFilter(e.target.value)}
              placeholder="12.00"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-blue-300/50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredUniversities.map((univ) => (
          <div key={univ.name} className="glass-panel card-hover overflow-hidden rounded-3xl">
            <div className={`flex h-24 items-center justify-center bg-gradient-to-r ${univ.gradient}`}>
              <span className="text-3xl">{univ.icon}</span>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${univ.badge}`}>{univ.type}</span>
                <span className="text-sm text-blue-300">📍 {univ.city}</span>
              </div>
              <h3 className="mb-2 text-[1.45rem] font-bold leading-tight">{univ.name}</h3>
              <p className="mb-4 min-h-[52px] text-base leading-snug text-blue-300">{univ.desc}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300">Min. Score</p>
                  <p className="text-3xl font-bold text-green-400">{univ.score}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUniversity(univ)}
                  className="rounded-xl bg-blue-500 px-6 py-2 text-base font-semibold transition hover:bg-blue-600"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredUniversities.length === 0 ? (
        <div className="glass-panel rounded-2xl p-4 text-sm text-blue-200">No universities match your current filters.</div>
      ) : null}

      {selectedUniversity ? (
        <div ref={detailsRef} className="glass-panel float-up rounded-3xl border border-blue-400/25 p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold">{selectedUniversity.name} - Specialities</h2>
              <p className="mt-2 text-blue-300">{selectedUniversity.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUniversity(null)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              Hide
            </button>
          </div>

          <div className="space-y-4">
            {selectedUniversity.specialities.map((speciality) => (
              <div key={speciality.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{speciality.name}</h3>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                    Min moyenne: {speciality.minScore}
                  </span>
                </div>
                <p className="mb-2 text-sm text-blue-200">Main modules:</p>
                <div className="flex flex-wrap gap-2">
                  {speciality.modules.map((module) => (
                    <span key={module} className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-100">
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CareersSection({
  bacAverage,
  bacStream,
  mathGrade,
  physicsGrade,
}: {
  bacAverage: number;
  bacStream: string;
  mathGrade: number;
  physicsGrade: number;
}) {
  type CareerItem = {
    title: string;
    icon: string;
    desc: string;
    demand: string;
    salary: string;
    roadmap: string[];
    skills: string[];
    opportunities: string[];
    iconBg?: string;
    iconRing?: string;
    fitScore?: number;
    salaryMid?: number;
    nextStep?: string;
    studyFocus?: string[];
    universityTracks?: string[];
    tools?: string[];
    certifications?: string[];
    dailyTasks?: string[];
    challenges?: string[];
  };

  function demandRank(label: string): number {
    if (label === "Essential") return 4;
    if (label === "High Demand") return 3;
    if (label === "Growing") return 2;
    if (label === "Stable") return 1;
    return 0;
  }

  function salaryMidpoint(salary: string): number {
    const nums = (salary.match(/\d+/g) || []).map(Number);
    if (nums.length >= 2) return (nums[0] + nums[1]) / 2;
    return nums[0] || 0;
  }

  function computeFit(title: string, demand: string): number {
    const stream = (bacStream || "").toLowerCase();
    const t = title.toLowerCase();
    let score = 58 + Math.max(0, (bacAverage - 10) * 4) + demandRank(demand) * 2;

    if (t.includes("software")) {
      if (stream.includes("math") || stream.includes("science")) score += 10;
      score += Math.max(0, mathGrade - 12) * 1.5;
    }
    if (t.includes("data")) {
      if (stream.includes("math")) score += 12;
      score += Math.max(0, mathGrade - 12) * 1.8;
    }
    if (t.includes("electrical") || t.includes("civil")) {
      if (stream.includes("math") || stream.includes("tech") || stream.includes("science")) score += 10;
      score += Math.max(0, physicsGrade - 12) * 1.5;
    }
    if (t.includes("medical") || t.includes("pharmac")) {
      if (stream.includes("science")) score += 12;
      score += Math.max(0, bacAverage - 14) * 2;
    }
    if (t.includes("business") || t.includes("finance") || t.includes("econom")) {
      if (stream.includes("gestion") || stream.includes("econom") || stream.includes("commerce")) score += 12;
      score += Math.max(0, bacAverage - 12) * 1.2;
    }
    if (t.includes("law") || t.includes("journal") || t.includes("teacher") || t.includes("psycholog")) {
      if (stream.includes("lettres") || stream.includes("philo")) score += 12;
      score += Math.max(0, bacAverage - 11.5) * 1.1;
    }

    return Math.max(35, Math.min(99, Math.round(score)));
  }

  function inferStudyFocus(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes("software")) return ["Algorithms", "Programming projects", "System design"];
    if (t.includes("data")) return ["Statistics", "Python + SQL", "Machine learning"];
    if (t.includes("electrical")) return ["Circuit analysis", "Control systems", "Embedded labs"];
    if (t.includes("civil")) return ["Mechanics", "AutoCAD", "Construction planning"];
    if (t.includes("medical") || t.includes("pharmac")) return ["Biology/Chemistry", "Clinical foundations", "Ethics"];
    if (t.includes("law")) return ["Legal reasoning", "Case analysis", "Public speaking"];
    if (t.includes("psycholog")) return ["Human behavior", "Research methods", "Counseling basics"];
    if (t.includes("journal")) return ["News writing", "Media ethics", "Digital storytelling"];
    if (t.includes("teacher")) return ["Linguistics/literature", "Didactics", "Classroom communication"];
    return ["Communication", "Management", "Decision making"];
  }

  function inferNextStep(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("software")) return "Build one full-stack project and publish it.";
    if (t.includes("data")) return "Complete one analytics project with real data.";
    if (t.includes("electrical")) return "Create one small automation/electronics project.";
    if (t.includes("civil")) return "Practice AutoCAD and complete one mini design case.";
    if (t.includes("medical") || t.includes("pharmac")) return "Strengthen biology/chemistry and start clinical reading habits.";
    if (t.includes("law")) return "Read legal cases weekly and join a debate club.";
    if (t.includes("psycholog")) return "Volunteer in student support and practice observation reports.";
    if (t.includes("journal")) return "Write and publish one article each week.";
    if (t.includes("teacher")) return "Start peer tutoring and build a lesson portfolio.";
    return "Join a student club and practice case-based problem solving.";
  }

  function inferUniversityTracks(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes("software")) return ["Computer Science", "Software Engineering", "Information Systems"];
    if (t.includes("data")) return ["Data Science", "Computer Science", "Applied Mathematics"];
    if (t.includes("electrical")) return ["Electrical Engineering", "Electronics", "Automation"];
    if (t.includes("civil")) return ["Civil Engineering", "Construction Engineering", "Infrastructure"];
    if (t.includes("medical")) return ["Medicine", "Pharmacy", "Biomedical Sciences"];
    if (t.includes("pharmac")) return ["Pharmacy", "Pharmaceutical Sciences", "Biochemistry"];
    if (t.includes("law")) return ["Law", "Public Law", "Private Law"];
    if (t.includes("psycholog")) return ["Psychology", "Educational Psychology", "Clinical Psychology"];
    if (t.includes("journal")) return ["Journalism", "Media and Communication", "Digital Media"];
    if (t.includes("teacher")) return ["English Language", "Literature", "Education Sciences"];
    return ["Business Administration", "Management", "Economics"];
  }

  function inferTools(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes("software")) return ["Git/GitHub", "VS Code", "SQL", "Postman"];
    if (t.includes("data")) return ["Python", "SQL", "Power BI/Tableau", "Jupyter"];
    if (t.includes("electrical")) return ["MATLAB/Simulink", "Proteus", "AutoCAD Electrical", "PLC basics"];
    if (t.includes("civil")) return ["AutoCAD", "Revit", "MS Project/Primavera", "Excel"];
    if (t.includes("medical") || t.includes("pharmac")) return ["Medical references", "Clinical protocols", "Patient records basics", "Research reading"];
    if (t.includes("law")) return ["Legal databases", "Case brief templates", "Argument mapping", "Office suite"];
    if (t.includes("psycholog")) return ["SPSS basics", "Survey tools", "Interview frameworks", "Research logs"];
    if (t.includes("journal")) return ["Canva", "Audio/video editing", "CMS platforms", "Social analytics"];
    if (t.includes("teacher")) return ["LMS tools", "Presentation tools", "Assessment rubrics", "Classroom platforms"];
    return ["Excel", "PowerPoint", "Project tools", "Communication tools"];
  }

  function inferCertifications(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes("software")) return ["AWS/Azure Fundamentals", "Scrum Fundamentals", "Oracle SQL Basics"];
    if (t.includes("data")) return ["Google Data Analytics", "Microsoft Power BI", "Python for Data Analysis"];
    if (t.includes("electrical")) return ["PLC/Automation Basics", "Industrial Safety", "CAD Certification"];
    if (t.includes("civil")) return ["AutoCAD Certification", "Project Planning Basics", "HSE Construction"];
    if (t.includes("medical") || t.includes("pharmac")) return ["BLS/First Aid", "Clinical ethics training", "Research methods basics"];
    if (t.includes("law")) return ["Legal writing", "Mediation basics", "Public speaking"];
    if (t.includes("journal")) return ["Digital journalism", "Media ethics", "Fact-checking"];
    if (t.includes("teacher")) return ["TESOL/TEFL basics", "Instructional design", "Classroom management"];
    return ["Project Management Basics", "Communication", "Digital productivity"];
  }

  function inferDailyTasks(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes("software")) return ["Write and review code", "Fix bugs", "Design APIs/features"];
    if (t.includes("data")) return ["Clean data", "Build dashboards/models", "Present insights"];
    if (t.includes("electrical")) return ["Design/test circuits", "Troubleshoot systems", "Document technical specs"];
    if (t.includes("civil")) return ["Review plans", "Supervise site progress", "Coordinate with teams"];
    if (t.includes("medical") || t.includes("pharmac")) return ["Assess patients", "Plan treatments", "Update clinical records"];
    if (t.includes("law")) return ["Review legal texts", "Prepare case files", "Draft legal documents"];
    if (t.includes("psycholog")) return ["Conduct assessments", "Write observation notes", "Support counseling sessions"];
    if (t.includes("journal")) return ["Research stories", "Interview sources", "Publish content"];
    if (t.includes("teacher")) return ["Prepare lessons", "Deliver sessions", "Evaluate students"];
    return ["Plan operations", "Coordinate teams", "Track KPIs and outcomes"];
  }

  function inferChallenges(title: string): string[] {
    const t = title.toLowerCase();
    if (t.includes("software")) return ["Fast-changing tools", "Debugging under deadlines", "System complexity"];
    if (t.includes("data")) return ["Data quality issues", "Model interpretation", "Business communication"];
    if (t.includes("electrical")) return ["Safety constraints", "Complex fault diagnosis", "Field conditions"];
    if (t.includes("civil")) return ["Site risks", "Budget/time pressure", "Multi-stakeholder coordination"];
    if (t.includes("medical") || t.includes("pharmac")) return ["Long training path", "High responsibility", "Emotional pressure"];
    if (t.includes("law")) return ["Heavy reading load", "Argument rigor", "High pressure deadlines"];
    if (t.includes("psycholog")) return ["Emotional load", "Ethical boundaries", "Long-term follow-up"];
    if (t.includes("journal")) return ["Time pressure", "Source verification", "Editorial constraints"];
    if (t.includes("teacher")) return ["Classroom diversity", "Student engagement", "Continuous preparation"];
    return ["People management", "Decision pressure", "Changing market constraints"];
  }

  function fitTone(score: number): string {
    if (score >= 85) return "text-green-300";
    if (score >= 70) return "text-yellow-300";
    return "text-red-300";
  }

  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<CareerItem | null>(null);
  const [demandFilter, setDemandFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Best Fit");

  const careers: CareerItem[] = [
    {
      icon: "\u{1F4BB}",
      iconBg: "bg-blue-500/20",
      iconRing: "ring-blue-400/25",
      title: "Software Engineering",
      desc: "Design and develop software applications and systems",
      demand: "High Demand",
      salary: "120K-250K DZD",
      roadmap: ["Learn programming fundamentals", "Build web/mobile projects", "Practice with databases and APIs", "Apply for internships and junior roles"],
      skills: ["Problem Solving", "JavaScript/TypeScript", "Databases", "System Design"],
      opportunities: ["Backend Developer", "Frontend Developer", "Full-Stack Engineer", "QA Automation Engineer"],
    },
    {
      icon: "\u{1F3E5}",
      iconBg: "bg-green-500/20",
      iconRing: "ring-green-400/25",
      title: "Medical Doctor",
      desc: "Diagnose and treat patients in hospitals and clinics",
      demand: "Essential",
      salary: "150K-300K DZD",
      roadmap: ["Complete pre-med foundation", "Study medicine and clinical rotations", "Pass residency entrance requirements", "Specialize and practice"],
      skills: ["Clinical Reasoning", "Patient Care", "Communication", "Medical Ethics"],
      opportunities: ["General Practitioner", "Hospital Resident", "Specialist Doctor", "Public Health Physician"],
    },
    {
      icon: "\u{26A1}",
      iconBg: "bg-purple-500/20",
      iconRing: "ring-purple-400/25",
      title: "Electrical Engineer",
      desc: "Design electrical systems and power distribution",
      demand: "Growing",
      salary: "100K-200K DZD",
      roadmap: ["Master electrical fundamentals", "Study power/control systems", "Work on lab and field projects", "Join industry internships"],
      skills: ["Circuit Analysis", "Control Systems", "Power Engineering", "Troubleshooting"],
      opportunities: ["Power Engineer", "Automation Engineer", "Maintenance Engineer", "Embedded Systems Engineer"],
    },
    {
      icon: "\u{1F4CA}",
      iconBg: "bg-orange-500/20",
      iconRing: "ring-orange-400/25",
      title: "Data Scientist",
      desc: "Analyze data and build predictive models",
      demand: "Emerging",
      salary: "130K-280K DZD",
      roadmap: ["Learn statistics and Python", "Practice data cleaning and SQL", "Build machine learning models", "Create portfolio and deploy projects"],
      skills: ["Statistics", "Python", "Machine Learning", "Data Visualization"],
      opportunities: ["Data Analyst", "ML Engineer", "BI Analyst", "AI Research Assistant"],
    },
    {
      icon: "\u{1F3D7}\u{FE0F}",
      iconBg: "bg-cyan-500/20",
      iconRing: "ring-cyan-400/25",
      title: "Civil Engineer",
      desc: "Design and oversee construction of infrastructure",
      demand: "Stable",
      salary: "90K-180K DZD",
      roadmap: ["Study structural and geotechnical basics", "Learn CAD and project planning", "Gain site supervision experience", "Get certified and lead projects"],
      skills: ["Structural Design", "AutoCAD", "Site Management", "Project Planning"],
      opportunities: ["Site Engineer", "Structural Engineer", "Project Engineer", "Infrastructure Planner"],
    },
    {
      icon: "\u{1F4BC}",
      iconBg: "bg-red-500/20",
      iconRing: "ring-red-400/25",
      title: "Business Manager",
      desc: "Lead teams and manage business operations",
      demand: "High Demand",
      salary: "110K-220K DZD",
      roadmap: ["Learn business fundamentals", "Develop leadership and communication", "Practice with real case studies", "Grow into team/operations roles"],
      skills: ["Leadership", "Decision Making", "Communication", "Strategic Planning"],
      opportunities: ["Operations Manager", "Project Manager", "Sales Manager", "Business Consultant"],
    },
    {
      icon: "\u{2696}\u{FE0F}",
      iconBg: "bg-amber-500/20",
      iconRing: "ring-amber-400/25",
      title: "Lawyer",
      desc: "Represent clients, analyze legal issues, and draft legal documents",
      demand: "High Demand",
      salary: "100K-260K DZD",
      roadmap: ["Build legal foundations", "Practice case analysis and legal writing", "Complete internships in legal offices", "Prepare for bar/professional track"],
      skills: ["Legal Reasoning", "Argumentation", "Research", "Drafting"],
      opportunities: ["Corporate Lawyer", "Legal Advisor", "Litigation Associate", "Public Administration"],
    },
    {
      icon: "\u{1F9E0}",
      iconBg: "bg-fuchsia-500/20",
      iconRing: "ring-fuchsia-400/25",
      title: "Psychologist",
      desc: "Assess behavior and support mental health and learning outcomes",
      demand: "Growing",
      salary: "90K-190K DZD",
      roadmap: ["Study psychology foundations", "Train in assessment methods", "Gain supervised practice", "Specialize in clinical/educational tracks"],
      skills: ["Active Listening", "Assessment", "Empathy", "Research Methods"],
      opportunities: ["School Psychologist", "Counseling Assistant", "HR Behavioral Analyst", "Clinical Support"],
    },
    {
      icon: "\u{1F4F0}",
      iconBg: "bg-violet-500/20",
      iconRing: "ring-violet-400/25",
      title: "Journalist",
      desc: "Research, verify, and communicate information through digital and traditional media",
      demand: "Growing",
      salary: "80K-170K DZD",
      roadmap: ["Learn media writing and ethics", "Practice interviewing and fact-checking", "Build a publication portfolio", "Specialize in a reporting domain"],
      skills: ["Writing", "Interviewing", "Fact-checking", "Storytelling"],
      opportunities: ["Reporter", "Content Editor", "Digital Media Producer", "Communication Officer"],
    },
    {
      icon: "\u{1F393}",
      iconBg: "bg-sky-500/20",
      iconRing: "ring-sky-400/25",
      title: "English Teacher",
      desc: "Teach language skills and communication in schools or institutes",
      demand: "Stable",
      salary: "80K-180K DZD",
      roadmap: ["Master language and literature", "Learn teaching methodologies", "Practice classroom delivery", "Prepare for certification and recruitment"],
      skills: ["Pedagogy", "Communication", "Lesson Planning", "Assessment"],
      opportunities: ["Secondary Teacher", "Language Center Instructor", "Curriculum Assistant", "Education Coordinator"],
    },
    {
      icon: "\u{1F48A}",
      iconBg: "bg-lime-500/20",
      iconRing: "ring-lime-400/25",
      title: "Pharmacist",
      desc: "Ensure safe medication use and provide patient counseling",
      demand: "Essential",
      salary: "130K-260K DZD",
      roadmap: ["Complete pharmacy program", "Train in pharmacology and dispensing", "Develop clinical communication", "Enter hospital/community pharmacy"],
      skills: ["Pharmacology", "Precision", "Patient Counseling", "Regulatory Awareness"],
      opportunities: ["Community Pharmacist", "Hospital Pharmacist", "Regulatory Affairs", "Pharma Industry Associate"],
    },
  ];

  const [careerItems, setCareerItems] = useState<CareerItem[]>(careers);

  useEffect(() => {
    let active = true;
    api("/careers")
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setCareerItems(data as CareerItem[]);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const enrichedCareers = careerItems.map((career) => ({
    ...career,
    fitScore: computeFit(career.title, career.demand),
    salaryMid: salaryMidpoint(career.salary),
    studyFocus: inferStudyFocus(career.title),
    nextStep: inferNextStep(career.title),
    universityTracks: inferUniversityTracks(career.title),
    tools: inferTools(career.title),
    certifications: inferCertifications(career.title),
    dailyTasks: inferDailyTasks(career.title),
    challenges: inferChallenges(career.title),
  }));

  const visibleCareers = (() => {
    const filtered = enrichedCareers.filter((career) => demandFilter === "All" || career.demand === demandFilter);
    const sorted = [...filtered];
    if (sortBy === "Best Fit") {
      sorted.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    } else if (sortBy === "Highest Salary") {
      sorted.sort((a, b) => (b.salaryMid || 0) - (a.salaryMid || 0));
    } else {
      sorted.sort((a, b) => demandRank(b.demand) - demandRank(a.demand));
    }
    return sorted;
  })();

  useEffect(() => {
    if (selectedCareer && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCareer]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Career Pathways</h1>
        <p className="text-blue-300">Explore career options with profile-based fit and practical next steps</p>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-blue-200">Filter by Demand</label>
            <select value={demandFilter} onChange={(e) => setDemandFilter(e.target.value)} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <option>All</option>
              <option>Essential</option>
              <option>High Demand</option>
              <option>Growing</option>
              <option>Stable</option>
              <option>Emerging</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-blue-200">Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <option>Best Fit</option>
              <option>Highest Salary</option>
              <option>Market Demand</option>
            </select>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-blue-200">Profile snapshot</p>
            <p className="text-sm text-blue-100">BAC: {bacAverage > 0 ? bacAverage.toFixed(2) : "Not set"} | Stream: {bacStream || "Not set"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleCareers.map((career, index) => (
          <div key={career.title} className="glass-panel card-hover rounded-3xl p-6">
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-[0_8px_18px_rgba(15,31,63,0.35)] ring-1 ${career.iconBg || "bg-blue-500/20"} ${career.iconRing || "ring-blue-400/25"}`}>
              <span>{career.icon}</span>
            </div>
            <h3 className="mb-2 text-2xl font-bold leading-tight">{career.title}</h3>
            <p className="mb-4 text-xl leading-snug text-blue-300">{career.desc}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-500/25 px-3 py-1 text-xs font-medium text-blue-100">{career.demand}</span>
              <span className="rounded-full bg-green-500/25 px-3 py-1 text-xs font-medium text-green-300">{career.salary}</span>
              <span className={`rounded-full bg-white/10 px-3 py-1 text-xs font-medium ${fitTone(career.fitScore || 0)}`}>Fit {career.fitScore || 0}%</span>
              {index === 0 && sortBy === "Best Fit" ? <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-200">Top Match</span> : null}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCareer(career)}
              className="flex items-center gap-2 text-xl text-blue-300 transition hover:text-blue-200"
            >
              <span>{"->"}</span>
              <span>View Career Path</span>
            </button>
          </div>
        ))}
      </div>

      {selectedCareer ? (
        <div ref={detailsRef} className="glass-panel float-up rounded-3xl border border-blue-400/25 p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-3xl font-bold">
                <span>{selectedCareer.icon}</span>
                <span>{selectedCareer.title}</span>
              </h2>
              <p className="mt-2 text-blue-300">{selectedCareer.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCareer(null)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              Hide
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-500/25 px-3 py-1 text-sm text-blue-100">{selectedCareer.demand}</span>
            <span className="rounded-full bg-green-500/25 px-3 py-1 text-sm text-green-300">{selectedCareer.salary}</span>
            <span className={`rounded-full bg-white/10 px-3 py-1 text-sm ${fitTone(selectedCareer.fitScore || 0)}`}>Fit {selectedCareer.fitScore || 0}%</span>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-blue-200">Suggested focus for this path</p>
            <p className="mt-2 text-blue-100">{(selectedCareer.studyFocus || []).join(" | ")}</p>
            <p className="mt-2 text-sm text-cyan-200">Next step: {selectedCareer.nextStep}</p>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Recommended University Tracks</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.universityTracks || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Tools / Software to Learn</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.tools || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Useful Certifications</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.certifications || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Typical Daily Tasks</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.dailyTasks || []).join(" | ")}</p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-blue-200">Common Challenges to Expect</p>
            <p className="mt-2 text-blue-100">{(selectedCareer.challenges || []).join(" | ")}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-lg font-semibold">Roadmap</p>
              <ol className="space-y-2 text-sm text-blue-100">
                {selectedCareer.roadmap.map((step) => (
                  <li key={step} className="rounded-lg bg-white/5 px-3 py-2">{step}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-lg font-semibold">Key Skills</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {selectedCareer.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-200">
                    {skill}
                  </span>
                ))}
              </div>
              <p className="mb-3 text-lg font-semibold">Career Opportunities</p>
              <div className="flex flex-wrap gap-2">
                {selectedCareer.opportunities.map((opportunity) => (
                  <span key={opportunity} className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm text-cyan-200">
                    {opportunity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ProgramOption = {
  id: string;
  label: string;
  university: string;
  city: string;
  field: "Engineering" | "Medicine" | "Business" | "Other";
  speciality: string;
  minBac: number;
  duration: string;
  degreeType: string;
  employmentRate: number;
  researchStars: number;
};

function estimateDuration(speciality: string, field: ProgramOption["field"]): string {
  const lower = speciality.toLowerCase();
  if (lower.includes("medicine") || lower.includes("dentistry")) return "7 years";
  if (lower.includes("pharmacy")) return "6 years";
  if (field === "Engineering") return "5 years";
  if (field === "Business") return "5 years";
  return "3-5 years";
}

function estimateDegreeType(speciality: string, field: ProgramOption["field"]): string {
  const lower = speciality.toLowerCase();
  if (lower.includes("medicine")) return "Doctor of Medicine";
  if (lower.includes("pharmacy")) return "Doctor of Pharmacy";
  if (lower.includes("dentistry")) return "Doctor of Dental Surgery";
  if (field === "Engineering") return "Engineering Diploma";
  if (field === "Business") return "Master's";
  return "Bachelor's / Master's";
}

function estimateEmploymentRate(field: ProgramOption["field"], univType: string): number {
  const base = field === "Engineering" ? 89 : field === "Medicine" ? 93 : field === "Business" ? 85 : 80;
  const schoolBoost = univType.toLowerCase().includes("grande ecole") ? 3 : 0;
  return Math.min(98, base + schoolBoost);
}

function estimateResearchStars(field: ProgramOption["field"], univType: string): number {
  let stars = univType.toLowerCase().includes("grande ecole") ? 4 : 3;
  if (field === "Medicine" || field === "Engineering") stars += 1;
  return Math.min(5, stars);
}

function streamBoost(field: ProgramOption["field"], bacStream: string): number {
  const stream = bacStream.toLowerCase();
  if (field === "Engineering" && (stream.includes("math") || stream.includes("science"))) return 6;
  if (field === "Medicine" && (stream.includes("science") || stream.includes("biology"))) return 6;
  if (field === "Business" && (stream.includes("gestion") || stream.includes("econom") || stream.includes("commerce"))) return 6;
  if (field === "Other") return 3;
  return 1;
}

function computeFitScore(program: ProgramOption, bacAverage: number, bacStream: string): number {
  if (bacAverage <= 0) return 60;
  const gap = bacAverage - program.minBac;
  let score = 72 + gap * 8 + streamBoost(program.field, bacStream);
  if (gap < -1.5) score -= 20;
  if (gap > 1.5) score += 6;
  return Math.max(35, Math.min(99, Math.round(score)));
}

function scoreTone(score: number): string {
  if (score >= 85) return "text-green-300";
  if (score >= 70) return "text-yellow-300";
  return "text-red-300";
}

function bacTone(minBac: number, bacAverage: number): string {
  if (bacAverage <= 0) return "bg-white/10 text-blue-100";
  if (bacAverage >= minBac) return "bg-green-500/20 text-green-300";
  if (bacAverage >= minBac - 0.5) return "bg-yellow-500/20 text-yellow-300";
  return "bg-red-500/20 text-red-300";
}

function ComparisonSection({ bacAverage, bacStream }: { bacAverage: number; bacStream: string }) {
  const programs = useMemo<ProgramOption[]>(() => {
    return universityCards.flatMap((univ) =>
      univ.specialities.map((speciality) => {
        const field = inferUniversityField({
          ...univ,
          specialities: [speciality],
        });

        return {
          id: `${univ.name}__${speciality.name}`,
          label: `${univ.name} - ${speciality.name}`,
          university: univ.name,
          city: univ.city,
          field,
          speciality: speciality.name,
          minBac: Number(speciality.minScore || univ.score || 0),
          duration: estimateDuration(speciality.name, field),
          degreeType: estimateDegreeType(speciality.name, field),
          employmentRate: estimateEmploymentRate(field, univ.type),
          researchStars: estimateResearchStars(field, univ.type),
        };
      }),
    );
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => programs.slice(0, 3).map((p) => p.id));

  function updateSelected(index: number, value: string) {
    setSelectedIds((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex((id) => id === value);
      if (existingIndex !== -1 && existingIndex !== index) {
        const current = next[index];
        next[index] = value;
        next[existingIndex] = current;
        return next;
      }
      next[index] = value;
      return next;
    });
  }

  const selectedPrograms = selectedIds
    .map((id) => programs.find((p) => p.id === id))
    .filter((p): p is ProgramOption => Boolean(p));

  const fitScores = selectedPrograms.map((program) => computeFitScore(program, bacAverage, bacStream));

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Program Comparison</h1>
        <p className="text-blue-300">Compare programs with realistic admission and fit indicators</p>
      </div>

      <div className="glass-panel rounded-3xl p-6 md:p-8">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={`program-select-${index}`}>
              <label className="mb-2 block text-sm font-medium text-blue-200">Program {index + 1}</label>
              <select
                value={selectedIds[index] || ""}
                onChange={(e) => updateSelected(index, e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white"
              >
                {programs.map((program) => {
                  const usedElsewhere = selectedIds.some((id, idx) => idx !== index && id === program.id);
                  return (
                    <option key={program.id} value={program.id} disabled={usedElsewhere} style={{ color: "#0b1d33", backgroundColor: "#ffffff" }}>
                      {program.label}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-4 text-left text-blue-200">Criteria</th>
                {selectedPrograms.map((program) => (
                  <th key={`head-${program.id}`} className="px-4 py-4 text-center">
                    {program.university}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Min. BAC Score</td>
                {selectedPrograms.map((program) => (
                  <td key={`min-${program.id}`} className="px-4 py-4 text-center">
                    <span className={`rounded-full px-3 py-1 ${bacTone(program.minBac, bacAverage)}`}>{program.minBac.toFixed(2)}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Duration</td>
                {selectedPrograms.map((program) => (
                  <td key={`duration-${program.id}`} className="px-4 py-4 text-center">
                    {program.duration}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Degree Type</td>
                {selectedPrograms.map((program) => (
                  <td key={`degree-${program.id}`} className="px-4 py-4 text-center">
                    {program.degreeType}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Field</td>
                {selectedPrograms.map((program) => (
                  <td key={`field-${program.id}`} className="px-4 py-4 text-center">
                    {program.field}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">City</td>
                {selectedPrograms.map((program) => (
                  <td key={`city-${program.id}`} className="px-4 py-4 text-center">
                    {program.city}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Employment Rate (Estimated)</td>
                {selectedPrograms.map((program) => (
                  <td key={`employment-${program.id}`} className="px-4 py-4 text-center text-green-400">
                    {program.employmentRate}%
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Research Output</td>
                {selectedPrograms.map((program) => (
                  <td key={`research-${program.id}`} className="px-4 py-4 text-center text-yellow-300">
                    {"★".repeat(program.researchStars)}
                    {"☆".repeat(Math.max(0, 5 - program.researchStars))}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-4 text-blue-200">Admission Gap (Your BAC - Min)</td>
                {selectedPrograms.map((program) => {
                  const gap = bacAverage > 0 ? bacAverage - program.minBac : 0;
                  const gapClass = bacAverage <= 0 ? "text-blue-200" : gap >= 0 ? "text-green-300" : "text-red-300";
                  return (
                    <td key={`gap-${program.id}`} className={`px-4 py-4 text-center ${gapClass}`}>
                      {bacAverage <= 0 ? "Set BAC in Profile" : `${gap >= 0 ? "+" : ""}${gap.toFixed(2)}`}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-4 py-4 text-blue-200">Your Fit Score</td>
                {selectedPrograms.map((program, idx) => (
                  <td key={`fit-${program.id}`} className="px-4 py-4 text-center">
                    <span className={`font-semibold ${scoreTone(fitScores[idx] || 0)}`}>{fitScores[idx] || 0}%</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProfileSection({
  user,
  onUserUpdated,
  profileCompletion,
}: {
  user: { name: string; email: string; bac_stream: string; bac_average: number; math_grade: number; physics_grade: number; subject3_grade: number; wilaya: string };
  onUserUpdated: (next: { name: string; email: string; bac_stream: string; bac_average: number; math_grade: number; physics_grade: number; subject3_grade: number; wilaya: string }) => void;
  profileCompletion: number;
}) {
  const [form, setForm] = useState({
    bac_stream: normalizeBacStream(user.bac_stream || "Sciences"),
    bac_average: user.bac_average ?? 0,
    math_grade: user.math_grade ?? 0,
    physics_grade: user.physics_grade ?? 0,
    subject3_grade: user.subject3_grade ?? 0,
    wilaya: user.wilaya || "Algiers",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    setForm({
      bac_stream: normalizeBacStream(user.bac_stream || "Sciences"),
      bac_average: user.bac_average ?? 0,
      math_grade: user.math_grade ?? 0,
      physics_grade: user.physics_grade ?? 0,
      subject3_grade: user.subject3_grade ?? 0,
      wilaya: user.wilaya || "Algiers",
    });
  }, [user]);

  const hasUnsavedChanges = useMemo(
    () =>
      normalizeBacStream(form.bac_stream) !== normalizeBacStream(user.bac_stream || "Sciences") ||
      Number(form.bac_average) !== Number(user.bac_average ?? 0) ||
      Number(form.math_grade) !== Number(user.math_grade ?? 0) ||
      Number(form.physics_grade) !== Number(user.physics_grade ?? 0) ||
      Number(form.subject3_grade) !== Number(user.subject3_grade ?? 0) ||
      form.wilaya !== (user.wilaya || "Algiers"),
    [form, user],
  );

  const eligiblePrograms = useMemo(() => {
    const bac = Number(form.bac_average || 0);
    if (bac <= 0) return 0;
    return universityCards.reduce((count, univ) => {
      return count + univ.specialities.filter((sp) => Number(sp.minScore) <= bac).length;
    }, 0);
  }, [form.bac_average]);

  const orientationLevel = useMemo(() => {
    const bac = Number(form.bac_average || 0);
    const subject1 = Number(form.math_grade || 0);
    const subject2 = Number(form.physics_grade || 0);
    const subject3 = Number(form.subject3_grade || 0);
    const avgCore = (subject1 + subject2 + subject3) / 3;
    if (bac >= 16.5 && avgCore >= 14.5) return { text: "Strong eligibility", tone: "text-green-300" };
    if (bac >= 14.5 && avgCore >= 12) return { text: "Moderate eligibility", tone: "text-yellow-300" };
    if (bac > 0) return { text: "Needs improvement", tone: "text-orange-300" };
    return { text: "Incomplete profile", tone: "text-blue-200" };
  }, [form.bac_average, form.math_grade, form.physics_grade, form.subject3_grade]);

  const branchSubjects = useMemo(() => getBranchSubjectConfig(form.bac_stream), [form.bac_stream]);

  async function saveProfile() {
    const token = getToken();
    if (!token) {
      setSaveMsg("You are not authenticated.");
      return;
    }

    const numericFields: Array<[label: string, value: number]> = [
      ["BAC average", Number(form.bac_average)],
      [branchSubjects.subject1Label, Number(form.math_grade)],
      [branchSubjects.subject2Label, Number(form.physics_grade)],
      [branchSubjects.subject3Label, Number(form.subject3_grade)],
    ];
    const invalid = numericFields.find(([, value]) => Number.isNaN(value) || value < 0 || value > 20);
    if (invalid) {
      setSaveMsg(`${invalid[0]} must be between 0 and 20.`);
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      const payload = { ...form, bac_stream: normalizeBacStream(form.bac_stream) };
      const data = await api("/me/profile", {
        method: "PUT",
        token,
        body: payload,
      });
      onUserUpdated({ ...data.user, bac_stream: normalizeBacStream(data.user?.bac_stream || "Sciences") });
      setSaveMsg("Profile saved.");
    } catch (ex: unknown) {
      setSaveMsg(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetProfileForm() {
    setForm({
      bac_stream: normalizeBacStream(user.bac_stream || "Sciences"),
      bac_average: user.bac_average ?? 0,
      math_grade: user.math_grade ?? 0,
      physics_grade: user.physics_grade ?? 0,
      subject3_grade: user.subject3_grade ?? 0,
      wilaya: user.wilaya || "Algiers",
    });
    setSaveMsg("");
  }

  const userName = user.name;
  const userBacStream = form.bac_stream;
  const initial = (userName?.trim()?.charAt(0) || "A").toUpperCase();
  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">My Profile</h1>
        <p className="text-blue-300">Manage your academic information and preferences</p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-4xl font-bold">{initial}</div>
            <h2 className="text-xl font-bold">{userName}</h2>
            <p className="text-blue-300">BAC - {userBacStream}</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 py-3"><span className="text-blue-300">Profile Completion</span><span className="font-bold text-green-400">{profileCompletion}%</span></div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${profileCompletion}%` }} />
            </div>
            <div className="flex items-center justify-between border-b border-white/10 py-3"><span className="text-blue-300">Assessments Taken</span><span className="font-bold">0</span></div>
            <div className="flex items-center justify-between border-b border-white/10 py-3"><span className="text-blue-300">Programs Eligible (min BAC)</span><span className="font-bold">{eligiblePrograms}</span></div>
            <div className="flex items-center justify-between py-3"><span className="text-blue-300">Orientation Status</span><span className={`font-bold ${orientationLevel.tone}`}>{orientationLevel.text}</span></div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold">Academic Information</h3>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">BAC Branch</label>
                <select
                  value={form.bac_stream}
                  onChange={(e) => setForm((prev) => ({ ...prev, bac_stream: e.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                >
                  <option>Sciences</option>
                  <option>Mathematiques</option>
                  <option>Technique Math</option>
                  <option>Lettres et Philosophie</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">BAC Average</label>
                <input
                  type="number"
                  value={form.bac_average}
                  onChange={(e) => setForm((prev) => ({ ...prev, bac_average: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  max="20"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                />
                <p className="mt-1 text-xs text-blue-300">Based on current BAC average, you are eligible for about {eligiblePrograms} program(s).</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">{branchSubjects.subject1Label}</label>
                <input
                  type="number"
                  value={form.math_grade}
                  onChange={(e) => setForm((prev) => ({ ...prev, math_grade: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  max="20"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                />
                <p className="mt-1 text-xs text-blue-300">{branchSubjects.subject1Hint}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">{branchSubjects.subject2Label}</label>
                <input
                  type="number"
                  value={form.physics_grade}
                  onChange={(e) => setForm((prev) => ({ ...prev, physics_grade: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  max="20"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                />
                <p className="mt-1 text-xs text-blue-300">{branchSubjects.subject2Hint}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">{branchSubjects.subject3Label}</label>
                <input
                  type="number"
                  value={form.subject3_grade}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject3_grade: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  max="20"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                />
                <p className="mt-1 text-xs text-blue-300">{branchSubjects.subject3Hint}</p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-blue-200">Wilaya of Origin</label>
                <select
                  value={form.wilaya}
                  onChange={(e) => setForm((prev) => ({ ...prev, wilaya: e.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                >
                  {WILAYAS.map((wilaya) => (
                    <option key={wilaya} style={{ color: "#0b1d33", backgroundColor: "#ffffff" }}>
                      {wilaya}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={saveProfile} disabled={saving} className="glow-btn rounded-xl bg-blue-500 py-3 md:col-span-2 disabled:opacity-60">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={resetProfileForm}
                disabled={saving || !hasUnsavedChanges}
                className="rounded-xl border border-white/20 bg-white/10 py-3 transition hover:bg-white/20 md:col-span-2 disabled:opacity-50"
              >
                Reset Changes
              </button>
              {hasUnsavedChanges ? <p className="text-sm text-yellow-200 md:col-span-2">You have unsaved changes.</p> : null}
              {saveMsg ? <p className="text-sm text-blue-200 md:col-span-2">{saveMsg}</p> : null}
            </form>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 py-3"><span>Email Notifications</span><input type="checkbox" defaultChecked /></div>
              <div className="flex items-center justify-between py-3"><span>AI Recommendations</span><input type="checkbox" defaultChecked /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "dashboard";
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    bac_stream: string;
    bac_average: number;
    math_grade: number;
    physics_grade: number;
    subject3_grade: number;
    wilaya: string;
  } | null>(null);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    let done = 0;
    const total = 6;
    if ((user.bac_stream || "").trim() !== "") done += 1;
    if (Number(user.bac_average) > 0) done += 1;
    if (Number(user.math_grade) > 0) done += 1;
    if (Number(user.physics_grade) > 0) done += 1;
    if (Number(user.subject3_grade) > 0) done += 1;
    if ((user.wilaya || "").trim() !== "") done += 1;
    return Math.round((done / total) * 100);
  }, [user]);

  const universitiesMatched = useMemo(() => {
    const bac = Number(user?.bac_average || 0);
    if (bac <= 0) return 0;
    return universityCards.filter((u) => Number(u.score) <= bac).length;
  }, [user]);

  const suggestedSpecialities = useMemo(
    () =>
      suggestSpecialitiesForStudent({
        bacAverage: Number(user?.bac_average || 0),
        mathGrade: Number(user?.math_grade || 0),
        physicsGrade: Number(user?.physics_grade || 0),
        subject3Grade: Number(user?.subject3_grade || 0),
        bacStream: user?.bac_stream || "",
        wilaya: user?.wilaya || "",
      }),
    [user],
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    api("/me", { token })
      .then((data) => {
        setUser({ ...data.user, bac_stream: normalizeBacStream(data.user?.bac_stream || "Sciences") });
        setAuthChecked(true);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  const active = useMemo(() => {
    if (section === "assessment") return "AI Assessment";
    if (section === "universities") return "Universities";
    if (section === "careers") return "Career Paths";
    if (section === "comparison") return "Compare Programs";
    if (section === "profile") return "My Profile";
    return "Dashboard";
  }, [section]);

  function goSection(next: string) {
    router.push(`/dashboard?section=${next}`);
  }

  const content =
    section === "assessment" ? <AssessmentContent /> :
    section === "universities" ? <UniversitiesSection /> :
    section === "careers" ? (
      <CareersSection
        bacAverage={Number(user?.bac_average || 0)}
        bacStream={user?.bac_stream || ""}
        mathGrade={Number(user?.math_grade || 0)}
        physicsGrade={Number(user?.physics_grade || 0)}
      />
    ) :
    section === "comparison" ? <ComparisonSection bacAverage={Number(user?.bac_average || 0)} bacStream={user?.bac_stream || ""} /> :
    section === "profile" ? (
      <ProfileSection
        user={user || { name: "Student", email: "", bac_stream: "Sciences", bac_average: 0, math_grade: 0, physics_grade: 0, subject3_grade: 0, wilaya: "Algiers" }}
        onUserUpdated={setUser}
        profileCompletion={profileCompletion}
      />
    ) : (
      <DashboardHome
        goSection={goSection}
        userName={user?.name || "Student"}
        profileCompletion={profileCompletion}
        bacAverage={Number(user?.bac_average || 0)}
        universitiesMatched={universitiesMatched}
        suggestedSpecialities={suggestedSpecialities}
      />
    );

  if (!authChecked) {
    return (
      <main className="gradient-bg flex min-h-screen items-center justify-center">
        <div className="glass-panel rounded-2xl px-6 py-4 text-blue-200">Checking session...</div>
      </main>
    );
  }

  return <AppShell active={active} userName={user?.name || "Student"} userBacStream={user?.bac_stream || "Sciences"}>{content}</AppShell>;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="gradient-bg flex min-h-screen items-center justify-center">
          <div className="glass-panel rounded-2xl px-6 py-4 text-blue-200">Loading dashboard...</div>
        </main>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}


