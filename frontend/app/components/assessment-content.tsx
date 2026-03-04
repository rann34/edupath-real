"use client";

import { useMemo, useState } from "react";

type Option = {
  value: string;
  icon: string;
  title: string;
  desc: string;
};

type Question = {
  question: string;
  options: Option[];
};

type CareerResult = {
  title: string;
  icon: string;
  summary: string;
  recommendedMajors: string[];
  universityFit: string;
  skillsToBuild: string[];
  firstYearActions: string[];
};

const questions: Question[] = [
  {
    question: "What subjects do you enjoy most in school?",
    options: [
      { value: "sciences", icon: "\u{1F52C}", title: "Sciences & Mathematics", desc: "Physics, Chemistry, Biology, Math" },
      { value: "tech", icon: "\u{1F4BB}", title: "Technology & Computing", desc: "Programming, Systems, IT" },
      { value: "arts", icon: "\u{1F3A8}", title: "Arts & Literature", desc: "Languages, Writing, Design" },
      { value: "social", icon: "\u{1F91D}", title: "Social Sciences", desc: "Economics, History, Philosophy" },
    ],
  },
  {
    question: "How do you prefer to work?",
    options: [
      { value: "alone", icon: "\u{1F9D8}", title: "Independently", desc: "I prefer working on my own" },
      { value: "team", icon: "\u{1F465}", title: "In a Team", desc: "I enjoy collaborating with others" },
      { value: "lead", icon: "\u{1F451}", title: "Leading Others", desc: "I like to take charge" },
      { value: "flex", icon: "\u{1F504}", title: "Flexible", desc: "Depends on the situation" },
    ],
  },
  {
    question: "What type of work environment appeals to you?",
    options: [
      { value: "office", icon: "\u{1F3E2}", title: "Office Setting", desc: "Corporate or startup environment" },
      { value: "field", icon: "\u{1F69A}", title: "Field Work", desc: "Outdoors or traveling" },
      { value: "lab", icon: "\u{1F52C}", title: "Research Lab", desc: "Scientific or academic setting" },
      { value: "remote", icon: "\u{1F3E0}", title: "Remote Work", desc: "Work from anywhere" },
    ],
  },
  {
    question: "What motivates you the most?",
    options: [
      { value: "money", icon: "\u{1F4B0}", title: "Financial Success", desc: "High salary and benefits" },
      { value: "impact", icon: "\u{1F31F}", title: "Making an Impact", desc: "Contributing to society" },
      { value: "growth", icon: "\u{1F4C8}", title: "Personal Growth", desc: "Learning and development" },
      { value: "balance", icon: "\u{2696}\u{FE0F}", title: "Work-Life Balance", desc: "Time for personal life" },
    ],
  },
  {
    question: "What's your preferred problem-solving approach?",
    options: [
      { value: "analytical", icon: "\u{1F4CA}", title: "Analytical", desc: "Data-driven decisions" },
      { value: "creative", icon: "\u{1F4A1}", title: "Creative", desc: "Innovative solutions" },
      { value: "practical", icon: "\u{1F527}", title: "Practical", desc: "Hands-on approach" },
      { value: "collab", icon: "\u{1F91D}", title: "Collaborative", desc: "Team brainstorming" },
    ],
  },
  {
    question: "In logic puzzles, what is usually your strongest skill?",
    options: [
      { value: "logic_pattern", icon: "\u{1F9E9}", title: "Pattern Recognition", desc: "I quickly spot sequences and rules" },
      { value: "logic_precision", icon: "\u{1F4CF}", title: "Precision & Accuracy", desc: "I avoid mistakes and verify details" },
      { value: "logic_speed", icon: "\u{26A1}", title: "Fast Reasoning", desc: "I decide quickly under time pressure" },
      { value: "logic_hypothesis", icon: "\u{1F52D}", title: "Hypothesis Testing", desc: "I test ideas step by step" },
    ],
  },
  {
    question: "When facing a complex problem, what do you do first?",
    options: [
      { value: "breakdown", icon: "\u{1F5C2}\u{FE0F}", title: "Break it into parts", desc: "Divide the problem into smaller blocks" },
      { value: "model", icon: "\u{1F4D0}", title: "Build a model", desc: "Represent it with formulas/diagrams" },
      { value: "prototype", icon: "\u{1F6E0}\u{FE0F}", title: "Try a quick prototype", desc: "Learn by building and testing" },
      { value: "consult", icon: "\u{1F4AC}", title: "Discuss with others", desc: "Collect perspectives before acting" },
    ],
  },
  {
    question: "Which statement matches your reasoning style best?",
    options: [
      { value: "deductive", icon: "\u{1F4D8}", title: "Deductive", desc: "From principles to conclusions" },
      { value: "inductive", icon: "\u{1F4D7}", title: "Inductive", desc: "From examples to general rules" },
      { value: "experimental", icon: "\u{1F9EA}", title: "Experimental", desc: "I validate ideas with tests" },
      { value: "strategic", icon: "\u{1F3AF}", title: "Strategic", desc: "I optimize decisions for outcomes" },
    ],
  },
  {
    question: "What type of university program fits you best after high school?",
    options: [
      { value: "program_theory", icon: "\u{1F4DA}", title: "Theory-Heavy Program", desc: "Strong academic foundation and concepts" },
      { value: "program_practice", icon: "\u{1F527}", title: "Practice-Heavy Program", desc: "Labs, workshops, and concrete application" },
      { value: "program_project", icon: "\u{1F6E0}\u{FE0F}", title: "Project-Based Program", desc: "Build real projects every semester" },
      { value: "program_people", icon: "\u{1F91D}", title: "People-Centered Program", desc: "Communication, management, and impact" },
    ],
  },
  {
    question: "Which university environment do you prefer?",
    options: [
      { value: "env_research", icon: "\u{1F52C}", title: "Research University", desc: "Advanced labs and scientific rigor" },
      { value: "env_industry", icon: "\u{1F3ED}", title: "Industry-Oriented School", desc: "Internships and job-ready training" },
      { value: "env_business", icon: "\u{1F4BC}", title: "Business & Leadership School", desc: "Strategy, economics, entrepreneurship" },
      { value: "env_flexible", icon: "\u{1F3E0}", title: "Flexible / Hybrid Campus", desc: "Balance between study and personal life" },
    ],
  },
  {
    question: "What matters most in your university choice?",
    options: [
      { value: "choice_employability", icon: "\u{1F4C8}", title: "Employability", desc: "Fast entry into the job market" },
      { value: "choice_prestige", icon: "\u{1F3C6}", title: "Prestige & Excellence", desc: "Top ranking and strong reputation" },
      { value: "choice_cost", icon: "\u{1F4B8}", title: "Affordable Cost", desc: "Good value and manageable tuition" },
      { value: "choice_impact", icon: "\u{1F30D}", title: "Social Impact", desc: "Career that helps people and society" },
    ],
  },
  {
    question: "How far are you ready to go in studies after BAC?",
    options: [
      { value: "study_short", icon: "\u{23F1}\u{FE0F}", title: "Short Cycle", desc: "A practical path and quick graduation" },
      { value: "study_master", icon: "\u{1F393}", title: "Master Level", desc: "I plan to continue to Bac+5" },
      { value: "study_doctorate", icon: "\u{1F52D}", title: "Doctorate / Research", desc: "I want deep specialization and research" },
      { value: "study_undecided", icon: "\u{1F914}", title: "Still Exploring", desc: "I want options before finalizing" },
    ],
  },
  {
    question: "How comfortable are you with intensive weekly workload?",
    options: [
      { value: "workload_high", icon: "\u{1F525}", title: "Very Comfortable", desc: "I can handle demanding schedules" },
      { value: "workload_medium", icon: "\u{1F4C5}", title: "Moderately Comfortable", desc: "Balanced challenge works best" },
      { value: "workload_low", icon: "\u{1F33F}", title: "Prefer Lighter Pace", desc: "I learn better with lower pressure" },
      { value: "workload_adaptive", icon: "\u{1F503}", title: "Depends on the semester", desc: "I adapt based on course load" },
    ],
  },
  {
    question: "What type of evaluation do you perform best in?",
    options: [
      { value: "eval_exam", icon: "\u{1F4DD}", title: "Written Exams", desc: "Strong performance in timed assessments" },
      { value: "eval_project", icon: "\u{1F4C1}", title: "Projects", desc: "I perform best through practical delivery" },
      { value: "eval_oral", icon: "\u{1F3A4}", title: "Oral Presentations", desc: "I explain ideas clearly in front of others" },
      { value: "eval_mixed", icon: "\u{2696}\u{FE0F}", title: "Mixed Evaluation", desc: "Best with a balanced format" },
    ],
  },
  {
    question: "Which learning resource helps you most?",
    options: [
      { value: "learn_theory", icon: "\u{1F4D6}", title: "Books & Theory", desc: "I prefer structured deep reading" },
      { value: "learn_video", icon: "\u{1F4FA}", title: "Video Courses", desc: "Visual explanations help me learn faster" },
      { value: "learn_lab", icon: "\u{1F9EA}", title: "Labs & Practice", desc: "Hands-on experimentation is most effective" },
      { value: "learn_peer", icon: "\u{1F465}", title: "Peer Learning", desc: "I learn well with group study and discussion" },
    ],
  },
  {
    question: "What is your preferred early career start?",
    options: [
      { value: "start_internship", icon: "\u{1F4BC}", title: "Early Internships", desc: "Gain work exposure as soon as possible" },
      { value: "start_research", icon: "\u{1F52C}", title: "Research Assistant", desc: "Start through labs and research teams" },
      { value: "start_freelance", icon: "\u{1F4BB}", title: "Freelance/Projects", desc: "Build independent work quickly" },
      { value: "start_structured", icon: "\u{1F3E2}", title: "Structured Graduate Path", desc: "Prefer a formal step-by-step route" },
    ],
  },
];

const profiles: Record<string, CareerResult> = {
  software: {
    title: "Software Engineering",
    icon: "\u{1F4BB}",
    summary: "Strong fit for programming, systems thinking, and building digital products.",
    recommendedMajors: ["Computer Science", "Software Engineering", "Information Systems"],
    universityFit: "Best in project-based or industry-oriented programs with internships.",
    skillsToBuild: ["Programming fundamentals", "Algorithms and data structures", "Team collaboration (Git, agile)"],
    firstYearActions: ["Take logic and coding foundations", "Build 2-3 portfolio projects", "Join a tech club or hackathon"],
  },
  medicine: {
    title: "Medical Doctor",
    icon: "\u{1F3E5}",
    summary: "Good fit for science-driven work with high social impact and patient care.",
    recommendedMajors: ["Medicine", "Pharmacy", "Biomedical Sciences"],
    universityFit: "Best in science-heavy universities with strong labs and clinical partnerships.",
    skillsToBuild: ["Biology and chemistry mastery", "Precision and discipline", "Communication and empathy"],
    firstYearActions: ["Strengthen science core subjects", "Practice structured note-taking", "Explore volunteer opportunities"],
  },
  electrical: {
    title: "Electrical Engineering",
    icon: "\u{26A1}",
    summary: "Great match for analytical and practical problem-solving in technical systems.",
    recommendedMajors: ["Electrical Engineering", "Electronics", "Automation and Control"],
    universityFit: "Best in technical schools with labs, prototyping, and industry projects.",
    skillsToBuild: ["Math and physics depth", "Circuit and systems thinking", "Simulation and troubleshooting"],
    firstYearActions: ["Focus on calculus and physics", "Work on small electronics projects", "Learn one simulation tool"],
  },
  business: {
    title: "Business Manager",
    icon: "\u{1F4BC}",
    summary: "Strong profile for leadership, team coordination, and strategic decision-making.",
    recommendedMajors: ["Business Administration", "Management", "Economics and Finance"],
    universityFit: "Best in business-focused schools with case studies and internships.",
    skillsToBuild: ["Communication and negotiation", "Data-driven decision making", "Planning and leadership"],
    firstYearActions: ["Learn spreadsheet and analytics basics", "Join entrepreneurship or debate clubs", "Take part in team projects"],
  },
};

function scoreAnswers(answers: Record<number, string>) {
  const scores: Record<"software" | "medicine" | "electrical" | "business", number> = {
    software: 0,
    medicine: 0,
    electrical: 0,
    business: 0,
  };

  const a0 = answers[0];
  const a1 = answers[1];
  const a2 = answers[2];
  const a3 = answers[3];
  const a4 = answers[4];
  const a5 = answers[5];
  const a6 = answers[6];
  const a7 = answers[7];
  const a8 = answers[8];
  const a9 = answers[9];
  const a10 = answers[10];
  const a11 = answers[11];
  const a12 = answers[12];
  const a13 = answers[13];
  const a14 = answers[14];
  const a15 = answers[15];

  if (a0 === "tech") scores.software += 3;
  if (a0 === "sciences") {
    scores.medicine += 2;
    scores.electrical += 2;
  }
  if (a0 === "social") scores.business += 2;

  if (a1 === "team") {
    scores.business += 2;
    scores.medicine += 1;
  }
  if (a1 === "lead") scores.business += 3;
  if (a1 === "alone") scores.software += 1;

  if (a2 === "lab") {
    scores.medicine += 2;
    scores.electrical += 1;
  }
  if (a2 === "office") {
    scores.software += 1;
    scores.business += 1;
  }
  if (a2 === "field") scores.electrical += 2;
  if (a2 === "remote") scores.software += 2;

  if (a3 === "impact") scores.medicine += 2;
  if (a3 === "money") scores.business += 2;
  if (a3 === "growth") {
    scores.software += 1;
    scores.electrical += 1;
  }
  if (a3 === "balance") scores.software += 1;

  if (a4 === "analytical") scores.electrical += 2;
  if (a4 === "creative") scores.software += 2;
  if (a4 === "practical") scores.electrical += 1;
  if (a4 === "collab") {
    scores.business += 1;
    scores.medicine += 1;
  }

  if (a5 === "logic_pattern") {
    scores.software += 2;
    scores.electrical += 2;
  }
  if (a5 === "logic_precision") {
    scores.medicine += 2;
    scores.electrical += 1;
  }
  if (a5 === "logic_speed") {
    scores.business += 1;
    scores.software += 1;
  }
  if (a5 === "logic_hypothesis") {
    scores.medicine += 1;
    scores.software += 1;
    scores.electrical += 1;
  }

  if (a6 === "breakdown") {
    scores.software += 1;
    scores.electrical += 2;
  }
  if (a6 === "model") {
    scores.electrical += 2;
    scores.medicine += 1;
  }
  if (a6 === "prototype") {
    scores.software += 2;
    scores.electrical += 1;
  }
  if (a6 === "consult") {
    scores.business += 2;
    scores.medicine += 1;
  }

  if (a7 === "deductive") {
    scores.electrical += 2;
    scores.software += 1;
  }
  if (a7 === "inductive") {
    scores.medicine += 2;
    scores.business += 1;
  }
  if (a7 === "experimental") {
    scores.medicine += 1;
    scores.software += 1;
    scores.electrical += 1;
  }
  if (a7 === "strategic") {
    scores.business += 2;
    scores.software += 1;
  }

  if (a8 === "program_theory") {
    scores.electrical += 1;
    scores.medicine += 1;
  }
  if (a8 === "program_practice") {
    scores.electrical += 2;
    scores.medicine += 1;
  }
  if (a8 === "program_project") scores.software += 2;
  if (a8 === "program_people") {
    scores.business += 2;
    scores.medicine += 1;
  }

  if (a9 === "env_research") {
    scores.medicine += 2;
    scores.electrical += 2;
  }
  if (a9 === "env_industry") {
    scores.software += 2;
    scores.electrical += 1;
  }
  if (a9 === "env_business") scores.business += 3;
  if (a9 === "env_flexible") scores.software += 1;

  if (a10 === "choice_employability") {
    scores.software += 1;
    scores.business += 1;
    scores.electrical += 1;
  }
  if (a10 === "choice_prestige") {
    scores.medicine += 1;
    scores.electrical += 1;
  }
  if (a10 === "choice_cost") {
    scores.business += 1;
    scores.software += 1;
  }
  if (a10 === "choice_impact") scores.medicine += 2;

  if (a11 === "study_short") {
    scores.business += 1;
    scores.software += 1;
  }
  if (a11 === "study_master") {
    scores.software += 1;
    scores.electrical += 1;
    scores.business += 1;
  }
  if (a11 === "study_doctorate") {
    scores.medicine += 2;
    scores.electrical += 1;
  }
  if (a11 === "study_undecided") scores.business += 1;

  if (a12 === "workload_high") {
    scores.medicine += 1;
    scores.electrical += 1;
  }
  if (a12 === "workload_medium") {
    scores.software += 1;
    scores.business += 1;
  }
  if (a12 === "workload_low") scores.business += 1;
  if (a12 === "workload_adaptive") scores.software += 1;

  if (a13 === "eval_exam") {
    scores.medicine += 1;
    scores.electrical += 1;
  }
  if (a13 === "eval_project") {
    scores.software += 2;
    scores.electrical += 1;
  }
  if (a13 === "eval_oral") scores.business += 2;
  if (a13 === "eval_mixed") {
    scores.software += 1;
    scores.business += 1;
  }

  if (a14 === "learn_theory") {
    scores.medicine += 1;
    scores.electrical += 1;
  }
  if (a14 === "learn_video") scores.software += 1;
  if (a14 === "learn_lab") {
    scores.electrical += 1;
    scores.medicine += 1;
  }
  if (a14 === "learn_peer") scores.business += 1;

  if (a15 === "start_internship") {
    scores.software += 1;
    scores.business += 1;
    scores.electrical += 1;
  }
  if (a15 === "start_research") {
    scores.medicine += 1;
    scores.electrical += 1;
  }
  if (a15 === "start_freelance") scores.software += 2;
  if (a15 === "start_structured") scores.business += 1;

  return Object.keys(scores)
    .map((key) => ({ key, score: scores[key as keyof typeof scores] }))
    .sort((a, b) => b.score - a.score);
}

export function AssessmentContent() {
  const BASE_QUESTION_COUNT = 12;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [includeAdvanced, setIncludeAdvanced] = useState(false);
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);

  const activeQuestions = includeAdvanced ? questions : questions.slice(0, BASE_QUESTION_COUNT);
  const question = activeQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / activeQuestions.length) * 100;
  const selected = answers[currentQuestion];
  const ranked = useMemo(() => scoreAnswers(answers), [answers]);

  function chooseAnswer(value: string) {
    setAnswers((prev) => {
      const nextAnswers = { ...prev, [currentQuestion]: value };
      const isLastQuestion = currentQuestion === activeQuestions.length - 1;

      if (!isLastQuestion) {
        setTimeout(() => setCurrentQuestion((q) => Math.min(q + 1, activeQuestions.length - 1)), 120);
      } else if (!includeAdvanced && currentQuestion === BASE_QUESTION_COUNT - 1) {
        setTimeout(() => setShowAdvancedPrompt(true), 120);
      } else {
        setTimeout(() => setShowResult(true), 120);
      }

      return nextAnswers;
    });
  }

  function next() {
    if (!selected) return;

    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion((v) => v + 1);
      return;
    }

    if (!includeAdvanced && currentQuestion === BASE_QUESTION_COUNT - 1) {
      setShowAdvancedPrompt(true);
      return;
    }

    setShowResult(true);
  }

  function previous() {
    if (showAdvancedPrompt) {
      setShowAdvancedPrompt(false);
      return;
    }

    if (showResult) {
      setShowResult(false);
      setCurrentQuestion(activeQuestions.length - 1);
      return;
    }

    if (currentQuestion > 0) setCurrentQuestion((v) => v - 1);
  }

  function restart() {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResult(false);
    setIncludeAdvanced(false);
    setShowAdvancedPrompt(false);
  }

  function takeAdvancedSection() {
    setIncludeAdvanced(true);
    setShowAdvancedPrompt(false);
    setCurrentQuestion(BASE_QUESTION_COUNT);
  }

  function finishCoreNow() {
    setShowAdvancedPrompt(false);
    setShowResult(true);
  }

  if (showAdvancedPrompt) {
    return (
      <section className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">AI Career Assessment</h1>
          <p className="mt-2 text-blue-300">Core section completed. You can finish now or add advanced questions for higher accuracy.</p>
        </div>
        <div className="glass-panel rounded-3xl p-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-lg text-blue-100">Advanced section adds 4 extra questions focused on learning style and study rhythm.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={finishCoreNow} className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 transition hover:bg-white/20">
                Finish Now
              </button>
              <button onClick={takeAdvancedSection} className="glow-btn rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold">
                Continue with Advanced
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

    if (showResult) {
    const top = ranked[0] ?? { key: "software", score: 0 };
    const second = ranked[1] ?? { key: "medicine", score: 0 };
    const primary = profiles[top.key] ?? profiles.software;
    const secondary = profiles[second.key] ?? profiles.medicine;
    const maxScore = Math.max(1, ...(ranked.map((entry) => entry.score)));

    return (
      <section className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">AI Career Assessment Result</h1>
          <p className="mt-2 text-blue-300">Here is your recommendation based on your selected answers.</p>
        </div>

        <div className="glass-panel rounded-3xl p-8">
          <div className="rounded-2xl border border-white/10 bg-blue-500/15 p-6">
            <p className="text-sm text-blue-200">Top Recommendation</p>
            <h2 className="mt-2 flex items-center gap-3 text-3xl font-bold">
              <span>{primary.icon}</span>
              <span>{primary.title}</span>
            </h2>
            <p className="mt-3 text-blue-200">{primary.summary}</p>
            <p className="mt-3 text-sm text-blue-300">Confidence: {Math.min(99, 70 + top.score * 4)}%</p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-blue-200">Also suitable for you</p>
            <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
              <span>{secondary.icon}</span>
              <span>{secondary.title}</span>
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-blue-200">Recommended university majors</p>
              <p className="mt-2 text-lg text-blue-100">{primary.recommendedMajors.join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-blue-200">University environment fit</p>
              <p className="mt-2 text-lg text-blue-100">{primary.universityFit}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-blue-200">Skills to build now</p>
              <p className="mt-2 text-lg text-blue-100">{primary.skillsToBuild.join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-blue-200">First-year action plan</p>
              <p className="mt-2 text-lg text-blue-100">{primary.firstYearActions.join(" | ")}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-blue-200">Career fit breakdown</p>
            <div className="mt-4 space-y-3">
              {ranked.map((entry) => {
                const profile = profiles[entry.key];
                if (!profile) return null;
                const percent = Math.round((entry.score / maxScore) * 100);
                return (
                  <div key={entry.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-blue-100">
                        {profile.icon} {profile.title}
                      </span>
                      <span className="text-blue-300">{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-blue-500/80" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={previous} className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 transition hover:bg-white/20">
              {"\u{2190} Back"}
            </button>
            <button onClick={restart} className="glow-btn rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold">
              Retake Assessment
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Career Assessment</h1>
        <p className="mt-2 text-blue-300">Answer these questions to help us find your ideal career path</p>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-blue-300">
            Question {currentQuestion + 1} of {activeQuestions.length}
          </p>
          <div className="h-3 w-48 rounded-full bg-white/10">
            <div className="progress-bar h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h2 className="mb-6 text-xl font-bold md:text-2xl">{question.question}</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {question.options.map((option) => {
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => chooseAnswer(option.value)}
                className={`glass-panel rounded-xl border-2 p-5 text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-transparent hover:border-blue-500/50 hover:bg-blue-500/20"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="block text-xl text-blue-200">{option.icon}</span>
                  {isSelected ? <span className="text-sm text-green-300">Selected</span> : null}
                </div>
                <span className="text-xl font-semibold md:text-2xl">{option.title}</span>
                <p className="mt-1 text-base text-blue-300 md:text-lg">{option.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={previous}
            disabled={currentQuestion === 0}
            className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-lg transition-all hover:bg-white/20 disabled:opacity-50"
          >
            {"\u{2190} Previous"}
          </button>
          <button
            onClick={next}
            disabled={!selected}
            className="glow-btn rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {currentQuestion === activeQuestions.length - 1 ? `Finish ${"\u{2192}"}` : `Next ${"\u{2192}"}`}
          </button>
        </div>
      </div>
    </section>
  );
}
