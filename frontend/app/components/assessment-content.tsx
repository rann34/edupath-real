"use client";

import { useState } from "react";

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
  universities: string[];
  admissionScore: string;
  careerOpportunities: string[];
  skillsToBuild: string[];
  firstYearActions: string[];
};

const questions: Question[] = [
  {
    question: "Which area interests you most after BAC?",
    options: [
      { value: "sciences", icon: "🧪", title: "Sciences & Health", desc: "Biology, medicine, pharmacy, lab sciences" },
      { value: "tech", icon: "💻", title: "Technology & Engineering", desc: "Computing, engineering, systems, technical studies" },
      { value: "arts", icon: "🎨", title: "Arts, Design & Communication", desc: "Architecture, media, design, languages" },
      { value: "social", icon: "💼", title: "Business, Law & Society", desc: "Economics, management, law, social sciences" },
    ],
  },
  {
    question: "What type of university training fits you best?",
    options: [
      { value: "alone", icon: "📘", title: "Rigorous and Structured", desc: "Clear progression, strong academic framework" },
      { value: "team", icon: "🛠️", title: "Collaborative and Project-Based", desc: "Projects, teamwork, practical application" },
      { value: "lead", icon: "🎯", title: "Leadership and Decision-Making", desc: "Management, responsibility, strategy" },
      { value: "flex", icon: "🔄", title: "Flexible and Multidisciplinary", desc: "I want a path that keeps several options open" },
    ],
  },
  {
    question: "Which study environment do you prefer?",
    options: [
      { value: "lab", icon: "🏥", title: "Hospital or Science Lab", desc: "Medical, biological, or scientific environment" },
      { value: "field", icon: "🏗️", title: "Field, Workshop or Design Studio", desc: "Applied work, construction, design, production" },
      { value: "office", icon: "🏢", title: "Company or Business Environment", desc: "Office, management, finance, administration" },
      { value: "remote", icon: "🖥️", title: "Digital or Computer-Based Environment", desc: "Programming, systems, data, online work" },
    ],
  },
  {
    question: "What is your main goal after BAC?",
    options: [
      { value: "money", icon: "💼", title: "High Employability", desc: "A path that leads quickly to strong job opportunities" },
      { value: "impact", icon: "❤️", title: "Helping People or Society", desc: "I want useful and meaningful impact" },
      { value: "growth", icon: "🎓", title: "Building Deep Expertise", desc: "I am ready to study seriously and specialize" },
      { value: "balance", icon: "🧭", title: "Keeping Several Options Open", desc: "I prefer a path that leaves room to explore" },
    ],
  },
  {
    question: "Which type of subjects are you strongest in?",
    options: [
      { value: "bio", icon: "🧬", title: "Biology and Natural Sciences", desc: "Life sciences, health-related subjects, observation" },
      { value: "math", icon: "📐", title: "Mathematics and Physics", desc: "Calculation, logic, problem solving, technical reasoning" },
      { value: "lang", icon: "✍️", title: "Languages and Expression", desc: "Writing, speaking, communication, interpretation" },
      { value: "eco", icon: "📊", title: "Economics and Analysis", desc: "Management, economics, structured reasoning" },
    ],
  },
  {
    question: "What kind of study rhythm suits you best?",
    options: [
      { value: "demanding", icon: "🔥", title: "Very Demanding and Selective", desc: "I can handle intense programs and strong competition" },
      { value: "balanced", icon: "⚖️", title: "Balanced with Projects and Exams", desc: "I like a mix of theory, practical work, and evaluation" },
      { value: "creative_rhythm", icon: "🖌️", title: "Creative and Portfolio-Based", desc: "I prefer design, production, and visible output" },
      { value: "progressive", icon: "🪜", title: "Progressive with Several Choices Later", desc: "I prefer to keep orientation options open over time" },
    ],
  },
  {
    question: "What type of career start do you imagine after university?",
    options: [
      { value: "health_start", icon: "🩺", title: "Healthcare or Scientific Profession", desc: "Doctor, pharmacist, researcher, lab path" },
      { value: "tech_start", icon: "⚙️", title: "Engineer or Tech Specialist", desc: "Engineering, software, systems, technical field" },
      { value: "design_start", icon: "🏛️", title: "Designer, Architect or Media Role", desc: "Creative, visual, communication-based path" },
      { value: "business_start", icon: "📈", title: "Manager, Analyst or Legal/Business Role", desc: "Management, finance, law, consulting" },
    ],
  },
  {
    question: "What matters most in choosing your university path?",
    options: [
      { value: "prestige", icon: "🏆", title: "Prestige and Selective Training", desc: "I value reputation, excellence, and strong selection" },
      { value: "practical_outcome", icon: "🧰", title: "Practical Skills and Employability", desc: "I want a path that prepares me directly for work" },
      { value: "expression", icon: "🎭", title: "Creativity and Personal Expression", desc: "I want a path where I can create and express ideas" },
      { value: "flexibility_future", icon: "🧭", title: "Versatility and Future Flexibility", desc: "I prefer a path that keeps many future options open" },
    ],
  },
  {
    question: "Which learning style helps you progress the most?",
    options: [
      { value: "theory_learning", icon: "📚", title: "Detailed Theory and Textbooks", desc: "I learn best with structured academic explanations" },
      { value: "practical_learning", icon: "🧪", title: "Labs, Coding or Practical Sessions", desc: "Hands-on practice helps me understand better" },
      { value: "project_learning", icon: "🧱", title: "Projects, Portfolios and Creative Production", desc: "I learn by building and showing concrete work" },
      { value: "analysis_learning", icon: "🗣️", title: "Case Studies, Discussion and Analysis", desc: "I learn by comparing situations and reasoning through them" },
    ],
  },
  {
    question: "How important is direct contact with people in your future studies or work?",
    options: [
      { value: "people_high", icon: "👥", title: "Very Important", desc: "I want a path with strong human interaction" },
      { value: "people_medium", icon: "🤝", title: "Moderately Important", desc: "I like some interaction, but not all the time" },
      { value: "people_low", icon: "🧩", title: "Useful but not Central", desc: "It can help, but it is not my main focus" },
      { value: "people_minimal", icon: "🖥️", title: "Not Very Important", desc: "I am comfortable with more technical or independent work" },
    ],
  },
  {
    question: "What type of challenge motivates you most?",
    options: [
      { value: "science_challenge", icon: "🧬", title: "Solving Scientific or Medical Problems", desc: "I like questions linked to science, health, and precision" },
      { value: "tech_challenge", icon: "⚙️", title: "Building Systems and Technical Solutions", desc: "I enjoy making tools, systems, or technology work" },
      { value: "creative_challenge", icon: "🎨", title: "Designing Ideas, Spaces or Creative Content", desc: "I enjoy creating concepts, visuals, and original work" },
      { value: "business_challenge", icon: "📈", title: "Analyzing Organizations, Markets or Society", desc: "I enjoy understanding decisions, systems, and people" },
    ],
  },
  {
    question: "What kind of future path do you prefer?",
    options: [
      { value: "long_path", icon: "🎓", title: "Long, Selective Studies with Specialization", desc: "I accept a demanding path to reach a specialized profession" },
      { value: "technical_path", icon: "🛠️", title: "A Technical Path Leading to Strong Job Opportunities", desc: "I want practical and employable technical training" },
      { value: "creative_path", icon: "🏛️", title: "A Creative Path with Visible Personal Work", desc: "I want a path where my work can be seen and developed" },
      { value: "flexible_path", icon: "🧭", title: "A Flexible Path with Management or Social Opportunities", desc: "I want broad options for the future" },
    ],
  },
];

const defaultResult: CareerResult = {
  title: "Software Engineering",
  icon: "💻",
  summary: "You have an analytical mind. Software development is a great fit!",
  recommendedMajors: ["Computer Science", "Software Engineering", "Information Systems"],
  universities: ["USTHB", "ESI Alger", "Univ. Bejaia", "Univ. Oran 1"],
  admissionScore: "13.5 - 16.0 / 20",
  careerOpportunities: ["Software Developer", "Web Developer", "Data Scientist", "Cybersecurity"],
  skillsToBuild: ["Programming", "Algorithms", "Problem Solving"],
  firstYearActions: ["Learn Python/JavaScript", "Build personal projects", "Join coding communities"],
};

export function AssessmentContent() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<CareerResult | null>(null);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const selected = answers[currentQuestion];

  function chooseAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));

    window.setTimeout(() => {
      next(value);
    }, 160);
  }

  function next(answerOverride?: string) {
    const answerToUse = answerOverride ?? selected;
    if (!answerToUse) return;

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((v) => v + 1);
      return;
    }

    setIsLoading(true);
    setShowResult(true);

    const answersArray = Array.from({ length: questions.length }, (_, index) => answers[index] || "");
    answersArray[currentQuestion] = answerToUse;

    fetch("http://127.0.0.1:8000/api/ai/quiz/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersArray }),
    })
      .then((r) => r.json())
      .then((data) => {
        setTimeout(() => {
          setAiResult(data.result || defaultResult);
          setIsLoading(false);
        }, 3000);
      })
      .catch(() => {
        setTimeout(() => {
          setAiResult(defaultResult);
          setIsLoading(false);
        }, 3000);
      });
  }

  function previous() {
    if (showResult) {
      setShowResult(false);
      setCurrentQuestion(questions.length - 1);
      return;
    }
    if (currentQuestion > 0) setCurrentQuestion((v) => v - 1);
  }

  function restart() {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResult(false);
    setAiResult(null);
    setIsLoading(false);
  }

  if (showResult) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-bounce text-6xl mb-6">🧠</div>
            <h1 className="text-4xl font-bold text-white mb-4">AI is analyzing your profile...</h1>
            <p className="text-xl text-blue-200">Our algorithm is finding your perfect career match</p>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-100"></div>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-200"></div>
            </div>
          </div>
        </div>
      );
    }

    const result = aiResult || defaultResult;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">🎓 Your AI-Powered Career Recommendation</h1>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-7xl">{result.icon}</span>
              <div>
                <h2 className="text-3xl font-bold text-white">{result.title}</h2>
                <p className="text-blue-200 mt-2">{result.summary}</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">📚 Recommended Majors</h3>
                <ul className="space-y-2">
                  {result.recommendedMajors.map((major, i) => (
                    <li key={i} className="text-white flex items-center gap-2">
                      <span className="text-blue-400">▸</span> {major}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">🏛️ Recommended Universities</h3>
                <ul className="space-y-2">
                  {result.universities.map((uni, i) => (
                    <li key={i} className="text-white flex items-center gap-2">
                      <span className="text-blue-400">▸</span> {uni}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">📊 Estimated Admission Score</h3>
                <p className="text-white text-2xl font-bold">{result.admissionScore}</p>
                <p className="text-blue-200 text-sm mt-1">Based on 2025 thresholds</p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">💼 Career Opportunities</h3>
                <ul className="space-y-2">
                  {result.careerOpportunities.map((job, i) => (
                    <li key={i} className="text-white flex items-center gap-2">
                      <span className="text-blue-400">▸</span> {job}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">🛠️ Skills to Build Now</h3>
                <ul className="space-y-2">
                  {result.skillsToBuild.map((skill, i) => (
                    <li key={i} className="text-white flex items-center gap-2">
                      <span className="text-blue-400">▸</span> {skill}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">🎯 First Year Action Plan</h3>
                <ul className="space-y-2">
                  {result.firstYearActions.map((action, i) => (
                    <li key={i} className="text-white flex items-center gap-2">
                      <span className="text-blue-400">▸</span> {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={restart}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all transform hover:scale-105"
              >
                🔄 Retake Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="soft-grid min-h-screen bg-transparent py-6 px-4 md:py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white md:text-4xl mb-2">🧠 AI Career Assessment</h1>
        <p className="text-blue-200 mb-5 md:mb-6">Answer these questions to find your ideal career path</p>
        
        <div className="glass-panel rounded-3xl p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-blue-200">
              Question {currentQuestion + 1} of {questions.length}
            </p>
            <div className="h-2 w-32 rounded-full bg-white/20 md:w-48">
              <div 
                className="h-2 bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <h2 className="mb-3 text-xl font-bold text-white md:text-2xl">{question.question}</h2>
          <p className="mb-4 text-sm text-blue-200">
            Select one answer to continue automatically.
          </p>
          
          <div className="grid gap-3 md:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => chooseAnswer(option.value)}
                className={`rounded-xl p-4 text-left transition-all ${
                  selected === option.value
                    ? "bg-blue-500/30 border-2 border-blue-400"
                    : "bg-white/5 hover:bg-white/10 border-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl">{option.icon}</span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white md:text-lg">{option.title}</p>
                    <p className="text-sm text-blue-200">{option.desc}</p>
                  </div>
                  {selected === option.value && (
                    <span className="ml-auto text-green-400 text-sm">✓ Selected</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={previous}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
