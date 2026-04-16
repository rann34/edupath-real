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
      subject1Label: "science Grade",
      subject2Label: "Physics Grade",
      subject3Label: "Mathematics Grade",
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
  user,
  profileCompletion,
  bacAverage,
  universitiesMatched,
}: {
  goSection: (section: string) => void;
  userName: string;
  user: any;
  profileCompletion: number;
  bacAverage: number;
  universitiesMatched: number;
}) {
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [aiError, setAiError] = useState("");
  const [openRecommendation, setOpenRecommendation] = useState<string | null>(null);

 useEffect(() => {
  async function fetchAIRecommendations() {
    if (!user) return;
    
    setIsLoadingAI(true);
    setAiError("");
    
    const stream = user.bac_stream || "Sciences";
    const avg = user.bac_average || 0;
    const math = user.math_grade || 0;
    const physics = user.physics_grade || 0;
    const subject3 = user.subject3_grade || 0;
    const wilaya = user.wilaya || "Algiers";
    
    try {
      const data = await api("/api/ai/recommend", {
        method: "POST",
        body: {
          bac_stream: stream,
          bac_average: avg,
          math_grade: math,
          physics_grade: physics,
          subject3_grade: subject3,
          wilaya,
        },
      });

      if (data.recommendations) {
        const formatted = data.recommendations.map((rec: any) => ({
          label: rec.program.name,
          university: rec.program.university,
          minScore: rec.program.min_score,
          minScore1: rec.program.min_score_1,
          minScore2: rec.program.min_score_2,
          minScore3: rec.program.min_score_3,
          city: rec.program.city,
          modules: rec.program.modules || [],
          fit: Math.round(rec.match_percentage),
          eligible: rec.eligible,
          recommendationLevel: rec.recommendation_level,
          reason: rec.reason,
          whyRecommended: rec.why_recommended || [],
          subjectBreakdown: rec.subject_breakdown || [],
          scoreDetails: [`Required BAC: ${rec.program.min_score}/20`],
        }));
        setAiRecommendations(formatted);
      } else {
        setAiRecommendations([]);
        setAiError("No recommendations were returned.");
      }
    } catch (error: unknown) {
      setAiRecommendations([]);
      setAiError(error instanceof Error ? error.message : "AI recommendations are temporarily unavailable.");
    } finally {
      setIsLoadingAI(false);
    }
  }
  
  fetchAIRecommendations();
}, [user, user?.bac_average, user?.math_grade, user?.physics_grade, user?.subject3_grade, user?.wilaya]);

  const aiTopCards = aiRecommendations.slice(0, 3).map((item) => {
    const visual = recommendationVisual(getSpecialityTrack(item.label));
    return {
      title: item.label,
      university: item.university,
      subtitle: `${item.city} • ${visual.area}`,
      status: item.eligible ? "Eligible Now" : "Near Threshold",
      statusTone: item.eligible
        ? "border-emerald-400/25 bg-emerald-400/12 text-emerald-100"
        : "border-amber-300/25 bg-amber-400/12 text-amber-100",
      gradient: visual.gradient,
      icon: visual.icon,
      reason: item.reason,
      whyRecommended: item.whyRecommended,
      subjectBreakdown: item.subjectBreakdown,
      modules: item.modules,
      recommendationLevel: item.recommendationLevel,
      fit: item.fit,
      minScore: item.minScore,
    };
  });
  const topRecommendation = aiTopCards[0];
  const eligibleCount = aiTopCards.filter((item) => item.status === "Eligible Now").length;
  const topGap =
    topRecommendation && bacAverage > 0
      ? Math.max(0, Number(topRecommendation.minScore) - bacAverage)
      : 0;
  const nextStepItems = [
    eligibleCount > 0
      ? `${eligibleCount} speciality${eligibleCount > 1 ? "ies are" : " is"} already within your current BAC range.`
      : "No speciality is fully unlocked yet with the current BAC profile.",
    topRecommendation
      ? topGap > 0
        ? `You are ${topGap.toFixed(2)} point${topGap >= 2 ? "s" : ""} away from your top current option.`
        : `${topRecommendation.title} is currently your strongest accessible option.`
      : "Complete your profile to unlock stronger recommendation details.",
    user?.wilaya
      ? `Priority is currently given to options near ${user.wilaya}.`
      : "Add your wilaya to improve local university suggestions.",
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-blue-300/80">Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white lg:text-[3.2rem]">Welcome back, {userName}!</h1>
          <p className="mt-2 text-[15px] text-blue-300/85">Your current profile, eligibility, and recommended options in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5">
            <p className="text-xs text-blue-200/60">Current focus</p>
            <p className="mt-1 text-sm font-semibold text-white">Eligible specialties first</p>
          </div>
          <button className="rounded-xl border border-white/8 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]">
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [`${profileCompletion}%`, "Profile Complete", profileCompletion > 0 ? "+progress" : "Start", "bg-blue-500/20", "text-blue-300", "\u{2705}"],
          [`${universitiesMatched}`, "Universities Matched", universitiesMatched > 0 ? "Ready" : "New", "bg-green-500/20", "text-green-400", "\u{1F3EB}"],
          [bacAverage.toFixed(2), "BAC Average", bacAverage > 0 ? "Updated" : "Pending", "bg-purple-500/20", "text-purple-300", "\u{1F4C8}"],
          [topRecommendation?.title || "Pending", "Top Match", topRecommendation ? topRecommendation.status : "Waiting", "bg-cyan-500/20", "text-cyan-300", "\u{1F3AF}"],
        ].map(([v, l, t, iconBg, trendColor, sticker]) => (
          <div key={l} className="rounded-2xl border border-white/8 bg-slate-900/28 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ring-1 ring-white/10 ${iconBg}`}>
                <span>{sticker}</span>
              </div>
              <span className={`text-xs font-medium ${trendColor}`}>{t}</span>
            </div>
            <h3 className={`leading-none text-white ${l === "Top Match" ? "text-lg font-semibold" : "text-3xl font-bold"}`}>{v}</h3>
            <p className="mt-2 text-[15px] text-blue-200/90">{l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/8 bg-slate-900/30 p-6">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg">
              <span>{"\u{1F4A1}"}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-300/80">Decision Support</p>
              <h2 className="mt-1 text-2xl font-bold">AI Recommendations</h2>
              <p className="mt-2 max-w-2xl text-sm text-blue-300">Based on your BAC profile, grades, and actual admission thresholds.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-xs text-blue-200/60">Top Match</p>
              <p className="mt-1 text-sm font-semibold text-white">{aiTopCards[0]?.title || "Pending"}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-xs text-blue-200/60">Selection Rule</p>
              <p className="mt-1 text-sm font-semibold text-white">BAC + subject thresholds</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoadingAI ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-200 md:col-span-3">
              🧠 AI is analyzing your profile...
            </div>
          ) : aiError ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100 md:col-span-3">
              {aiError}
            </div>
          ) : aiTopCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-blue-200 md:col-span-3">
              No AI recommendations yet for this profile.
            </div>
          ) : (
            aiTopCards.map((card) => (
              <div
                key={`${card.university}-${card.title}`}
                className="rounded-2xl border border-white/8 bg-slate-950/22 p-4 text-left"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-lg ring-1 ring-white/10">
                    <span>{card.icon}</span>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${card.statusTone}`}>{card.status}</span>
                </div>

                <h3 className="text-lg font-bold text-white">{card.title}</h3>
                <p className="mt-1 text-sm text-blue-200">{card.university}</p>
                <p className="mt-1 text-xs text-blue-300/80">{card.subtitle}</p>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-blue-200/65">Required BAC</p>
                    <p className="mt-1 text-base font-semibold text-white">{card.minScore}/20</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-blue-200/65">Profile Fit</p>
                    <p className="mt-1 text-base font-semibold text-white">{card.fit}%</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm">
                  <span className="text-blue-300/75">Recommendation Level</span>
                  <span className="font-semibold text-white">{card.recommendationLevel}</span>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRecommendation((prev) =>
                        prev === `${card.university}-${card.title}` ? null : `${card.university}-${card.title}`,
                      )
                    }
                    className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                  >
                    {openRecommendation === `${card.university}-${card.title}` ? "Hide explanation" : "Why this recommendation?"}
                  </button>
                </div>

                {openRecommendation === `${card.university}-${card.title}` ? (
                  <div className="mt-3 space-y-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/65">Why This Recommendation</p>
                      <p className="mt-2 text-sm leading-6 text-blue-100">{card.reason}</p>
                      {card.whyRecommended?.length ? (
                        <div className="mt-3 space-y-2">
                          {card.whyRecommended.slice(0, 3).map((line: string, index: number) => (
                            <p key={index} className="text-sm leading-6 text-blue-100/90">
                              • {line}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {card.subjectBreakdown?.length ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/65">Your Grades vs Requirements</p>
                        <div className="mt-3 space-y-2">
                          {card.subjectBreakdown.map((item: any) => (
                            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-blue-100">{item.label}</span>
                              <span className="text-blue-200/85">
                                {item.grade}/20 vs {item.threshold}/20
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {card.modules?.length ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/65">Key Modules</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.modules.slice(0, 4).map((module: string) => (
                            <span key={module} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-blue-100">
                              {module}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => goSection("universities")}
                  className="mt-3 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                >
                  View university options →
                </button>
              </div>
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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">What to Improve</h3>
              <p className="mt-1 text-sm text-blue-200/75">Short guidance based on your profile and current recommendations.</p>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">
              {topRecommendation ? topRecommendation.status : "Profile needed"}
            </div>
          </div>
          <div className="space-y-3">
            {nextStepItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-blue-100">
                <span className="mt-0.5 text-cyan-300">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type UniversitySpeciality = {
  name: string;
  minScore: string;
  minScore1?: string;
  minScore2?: string;
  minScore3?: string;
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
  image?: string;
  imageMode?: "photo" | "logo";
  logoText?: string;
  website?: string;
  badge: string;
  specialities: UniversitySpeciality[];
};

const UNIVERSITY_MEDIA: Record<string, { image?: string; imageMode?: "photo" | "logo"; logoText?: string }> = {
  "ENP": { image: "https://www.enp.edu.dz/storage/2020/06/logoBlanc-300x262.png", imageMode: "logo", logoText: "ENP" },
  "ESI": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/ESI_Logo.png", imageMode: "logo", logoText: "ESI" },
  "HEC Algiers": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Logo_hec.jpg", imageMode: "logo", logoText: "HEC" },
  "USTHB": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/USTHB.JPG", imageMode: "photo", logoText: "USTHB" },
  "USTO-MB": { image: "https://www.univ-usto.dz/wp-content/uploads/2023/11/cropped-cropped-cropped-USTOLOGO-1-scaled-1.png", imageMode: "logo", logoText: "USTO-MB" },
  "University of Algiers 1": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Med%20Alger.jpg", imageMode: "photo", logoText: "UA1" },
  "University of Algiers 1 - Faculty of Sciences": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Main_building_of_the_University_of_Algiers_-_Pavillon_gauche.jpg", imageMode: "photo", logoText: "SCI" },
  "University of Algiers 2": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/%D9%85%D8%B9%D9%84%D9%85_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%AC%D8%B2%D8%A7%D8%A6%D8%B1_02.jpg", imageMode: "photo", logoText: "UA2" },
  "University of Bejaia": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Tasdawit%20n%20Bgayet%2002.jpg", imageMode: "photo", logoText: "UB" },
  "University of Blida 1": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Universit%C3%A9_Saad_Dahleb_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%B3%D8%B9%D8%AF_%D8%AF%D8%AD%D9%84%D8%A8_-_panoramio.jpg", imageMode: "photo", logoText: "UB1" },
  "University of Constantine 1": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/%D8%A7%D9%84%D8%A8%D8%B1%D8%AC_%D8%A7%D9%84%D8%A5%D8%AF%D8%A7%D8%B1%D9%8A_%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%A5%D8%AE%D9%88%D8%A9_%D9%85%D9%86%D8%AA%D9%88%D8%B1%D9%8A_%D9%82%D8%B3%D9%86%D8%B7%D9%8A%D9%86%D8%A9.jpg", imageMode: "photo", logoText: "UC1" },
  "University of Oran 1": { image: "https://commons.wikimedia.org/wiki/Special:FilePath/LOGO_UNIV_ORAN_1_Anglais.png", imageMode: "logo", logoText: "UO1" },
};

function attachUniversityImage(univ: UniversityCard): UniversityCard {
  const media = UNIVERSITY_MEDIA[univ.name];
  const websites: Record<string, string> = {
    "ENP": "https://www.enp.edu.dz/en/",
    "ESI": "https://www.esi.dz/en/home/",
    "HEC Algiers": "https://hec.dz/newsite/?lang=en",
    "USTHB": "https://www.usthb.dz/",
    "USTO-MB": "https://www.univ-usto.dz/en/",
    "University of Algiers 1": "https://www.univ-alger.dz/",
    "University of Algiers 1 - Faculty of Sciences": "https://www.univ-alger.dz/",
    "University of Algiers 2": "https://www.univ-alger2.dz/index.php/en/",
    "University of Bejaia": "https://www.univ-bejaia.dz/en/",
    "University of Blida 1": "https://www.univ-blida.dz/en/",
    "University of Constantine 1": "https://www.umc.edu.dz/",
    "University of Oran 1": "https://univ-oran1.dz/language/en/",
  };
  return {
    ...univ,
    image: media?.image || univ.image,
    imageMode: media?.imageMode || univ.imageMode,
    logoText: media?.logoText || univ.logoText,
    website: websites[univ.name] || univ.website,
  };
}

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
].map(attachUniversityImage);



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
          setUniversities((data as UniversityCard[]).map(attachUniversityImage));
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
            <div
              className={`relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-r ${univ.gradient}`}
              style={
                univ.image
                  ? {
                      backgroundImage:
                        univ.imageMode === "logo"
                          ? `url(${univ.image})`
                          : `linear-gradient(rgba(9, 18, 32, 0.18), rgba(9, 18, 32, 0.48)), url(${univ.image})`,
                      backgroundSize: univ.imageMode === "logo" ? "contain" : "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundColor: univ.imageMode === "logo" ? "rgba(255,255,255,0.92)" : undefined,
                    }
                  : undefined
              }
            >
              {univ.image && univ.imageMode !== "logo" ? (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 to-transparent" />
              ) : null}
              {!univ.image && univ.logoText ? (
                <div className="relative z-10 rounded-2xl border border-white/20 bg-slate-950/20 px-5 py-2 shadow-lg backdrop-blur-sm">
                  <span className="text-2xl font-extrabold tracking-[0.18em] text-white">{univ.logoText}</span>
                </div>
              ) : null}
              {!univ.image && !univ.logoText ? <span className="relative z-10 text-3xl">{univ.icon}</span> : null}
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${univ.badge}`}>{univ.type}</span>
                <span className="text-sm text-blue-300">📍 {univ.city}</span>
              </div>
              <h3 className="mb-2 text-[1.45rem] font-bold leading-tight">{univ.name}</h3>
              <p className="mb-4 min-h-[52px] text-base leading-snug text-blue-300">{univ.desc}</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-blue-300">Min. Score</p>
                  <p className="text-3xl font-bold text-green-400">{univ.score}</p>
                </div>
                <div className="flex items-center gap-2">
                  {univ.website ? (
                    <a
                      href={univ.website}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/[0.08]"
                    >
                      Official Site
                    </a>
                  ) : null}
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
              {selectedUniversity.website ? (
                <a
                  href={selectedUniversity.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Visit official website
                </a>
              ) : null}
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
                    {speciality.minScore1 ? ` | Min 1: ${speciality.minScore1}` : ""}
                    {speciality.minScore2 ? ` | Min 2: ${speciality.minScore2}` : ""}
                    {speciality.minScore3 ? ` | Min 3: ${speciality.minScore3}` : ""}
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
  const topCareer = visibleCareers[0];

  useEffect(() => {
    if (selectedCareer && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCareer]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-cyan-200/75">Career Explorer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">Career paths that match your profile</h1>
          <p className="mt-3 text-blue-300">Explore realistic options based on your BAC profile, current strengths, and the type of future you want to build.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-blue-200/55">Top Match</p>
            <p className="mt-1 text-sm font-semibold text-white">{topCareer?.title || "Not available"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-blue-200/55">Profile Context</p>
            <p className="mt-1 text-sm font-semibold text-white">
              BAC {bacAverage > 0 ? bacAverage.toFixed(2) : "Not set"} • {bacStream || "Stream not set"}
            </p>
          </div>
        </div>
      </div>

      {topCareer ? (
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-500/12 via-slate-900/30 to-blue-500/12 p-6 md:p-7">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">Best current fit</span>
                <span className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-1 text-xs text-blue-100">{topCareer.demand}</span>
              </div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">{topCareer.title}</h2>
              <p className="mt-3 max-w-2xl text-blue-100/90">{topCareer.desc}</p>
              <p className="mt-4 text-sm text-cyan-100">Suggested focus: {(topCareer.studyFocus || []).slice(0, 3).join(" • ")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-200/55">Fit Score</p>
                <p className={`mt-2 text-2xl font-bold ${fitTone(topCareer.fitScore || 0)}`}>{topCareer.fitScore || 0}%</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-200/55">Estimated Salary</p>
                <p className="mt-2 text-2xl font-bold text-white">{topCareer.salary}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-200/55">Next Step</p>
                <p className="mt-2 text-sm font-medium text-blue-100">{topCareer.nextStep}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
          <div key={career.title} className="glass-panel card-hover rounded-3xl p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-[0_8px_18px_rgba(15,31,63,0.35)] ring-1 ${career.iconBg || "bg-blue-500/20"} ${career.iconRing || "ring-blue-400/25"}`}>
                <span>{career.icon}</span>
              </div>
              {index === 0 && sortBy === "Best Fit" ? <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-200">Top Match</span> : null}
            </div>
            <h3 className="text-xl font-bold leading-tight text-white">{career.title}</h3>
            <p className="mt-2 min-h-[72px] text-sm leading-6 text-blue-200/90">{career.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-500/25 px-3 py-1 text-xs font-medium text-blue-100">{career.demand}</span>
              <span className="rounded-full bg-green-500/25 px-3 py-1 text-xs font-medium text-green-300">{career.salary}</span>
              <span className={`rounded-full bg-white/10 px-3 py-1 text-xs font-medium ${fitTone(career.fitScore || 0)}`}>Fit {career.fitScore || 0}%</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/55">Best Study Focus</p>
                <p className="mt-2 text-sm font-medium text-white">{career.studyFocus?.[0] || "General skills"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/55">Typical Entry</p>
                <p className="mt-2 text-sm font-medium text-white">{career.opportunities?.[0] || "Career path"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCareer(career)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
            >
              <span>View career path</span>
              <span>{"->"}</span>
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

          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Suggested focus</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.studyFocus || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Best next step</p>
              <p className="mt-2 text-blue-100">{selectedCareer.nextStep}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Typical opportunities</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.opportunities || []).slice(0, 2).join(" | ")}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Recommended university tracks</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.universityTracks || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Tools and software to learn</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.tools || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Useful certifications</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.certifications || []).join(" | ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-blue-200">Typical daily tasks</p>
              <p className="mt-2 text-blue-100">{(selectedCareer.dailyTasks || []).join(" | ")}</p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-blue-200">Common challenges to expect</p>
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
  programTrack: string;
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

function estimateProgramTrack(speciality: string, field: ProgramOption["field"], university: string): string {
  const lower = speciality.toLowerCase();
  const lowerUniversity = university.toLowerCase();

  if (lower.includes("lmd")) return "LMD";
  if (lower.includes("classique") || lower.includes("ingenieur") || lower.includes("ingénieur")) return "Ingénieur";
  if (lower.includes("medicine") || lower.includes("pharmacy") || lower.includes("dentistry")) return "Doctorat";
  if (field === "Engineering" && (lowerUniversity.includes("enp") || lowerUniversity.includes("esi"))) return "Ingénieur";
  if (field === "Engineering") return "LMD";
  if (field === "Business" || field === "Other") return "LMD";
  return "Standard";
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
          programTrack: estimateProgramTrack(speciality.name, field, univ.name),
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
                <td className="px-4 py-4 text-blue-200">Program Track</td>
                {selectedPrograms.map((program) => (
                  <td key={`field-${program.id}`} className="px-4 py-4 text-center">
                    {program.programTrack}
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
  const inputClass =
    "w-full rounded-2xl border border-slate-200/10 bg-slate-950/20 px-4 py-3 text-white shadow-inner shadow-black/5 transition placeholder:text-slate-300/40 focus:border-cyan-300/40 focus:bg-slate-950/30";

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
        <div className="rounded-[28px] border border-white/10 bg-slate-900/35 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-4xl font-bold">{initial}</div>
            <h2 className="text-xl font-bold">{userName}</h2>
            <p className="text-blue-300">BAC - {userBacStream}</p>
          </div>

          <div className="mb-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-300/80">Profile Completion</span>
              <span className="text-lg font-semibold text-emerald-400">{profileCompletion}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/8">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-300/65">A more complete profile improves the quality of your orientation results.</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300/78">Orientation Status</span>
                <span className={`text-right text-sm font-semibold ${orientationLevel.tone}`}>{orientationLevel.text}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300/78">Programs Eligible</span>
                <span className="text-lg font-semibold text-white">{eligiblePrograms}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300/78">Assessments Taken</span>
                <span className="text-lg font-semibold text-white">0</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300/78">Preferred Wilaya</span>
                <span className="text-sm font-semibold text-white">{form.wilaya}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/35 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="mb-6 border-b border-white/8 pb-5">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">Student Record</p>
                <h3 className="text-2xl font-semibold text-white">Academic Profile</h3>
                <p className="mt-1 text-sm text-slate-300/80">Keep your grades and location updated for better recommendations.</p>
              </div>
            </div>

            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">BAC Branch</label>
                  <select
                    value={form.bac_stream}
                    onChange={(e) => setForm((prev) => ({ ...prev, bac_stream: e.target.value }))}
                    className={inputClass}
                  >
                    <option>Sciences</option>
                    <option>Mathematiques</option>
                    <option>Technique Math</option>
                    <option>Lettres et Philosophie</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">BAC Average</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.bac_average}
                      onChange={(e) => setForm((prev) => ({ ...prev, bac_average: Number(e.target.value) }))}
                      step="0.01"
                      min="0"
                      max="20"
                      className={`${inputClass} pr-12`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-300/65">/20</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-white">Core Subject Grades</h4>
                    <p className="text-sm text-slate-300/75">Enter your three main grades used for orientation.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-200">{branchSubjects.subject1Label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.math_grade}
                        onChange={(e) => setForm((prev) => ({ ...prev, math_grade: Number(e.target.value) }))}
                        step="0.01"
                        min="0"
                        max="20"
                        className={`${inputClass} pr-12`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-300/65">/20</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-200">{branchSubjects.subject2Label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.physics_grade}
                        onChange={(e) => setForm((prev) => ({ ...prev, physics_grade: Number(e.target.value) }))}
                        step="0.01"
                        min="0"
                        max="20"
                        className={`${inputClass} pr-12`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-300/65">/20</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-200">{branchSubjects.subject3Label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.subject3_grade}
                        onChange={(e) => setForm((prev) => ({ ...prev, subject3_grade: Number(e.target.value) }))}
                        step="0.01"
                        min="0"
                        max="20"
                        className={`${inputClass} pr-12`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-300/65">/20</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 md:p-5">
                  <label className="mb-2 block text-sm font-medium text-slate-200">Wilaya of Origin</label>
                  <select
                    value={form.wilaya}
                    onChange={(e) => setForm((prev) => ({ ...prev, wilaya: e.target.value }))}
                    className={inputClass}
                  >
                    {WILAYAS.map((wilaya) => (
                      <option key={wilaya} style={{ color: "#0b1d33", backgroundColor: "#ffffff" }}>
                        {wilaya}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-300/65">Used to prioritize nearby universities in the recommendation flow.</p>
                </div>

                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 md:p-5">
                  <p className="text-sm font-medium text-slate-200">Quick Summary</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b border-white/8 pb-3">
                      <span className="text-slate-300/75">Eligible Programs</span>
                      <span className="font-semibold text-white">{eligiblePrograms}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/8 pb-3">
                      <span className="text-slate-300/75">Selected Branch</span>
                      <span className="font-semibold text-white">{form.bac_stream}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300/75">Preferred Wilaya</span>
                      <span className="font-semibold text-white">{form.wilaya}</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                type="button"
                onClick={resetProfileForm}
                disabled={saving || !hasUnsavedChanges}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50"
              >
                🔄 Reset Changes
              </button>
            </div>

            {hasUnsavedChanges ? <p className="mt-3 text-sm text-amber-200">You have unsaved changes.</p> : null}
            {saveMsg ? <p className="mt-2 text-sm text-cyan-100">{saveMsg}</p> : null}
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

const [profileVersion, setProfileVersion] = useState(0);

// Quand onUserUpdated est appelé, incrémente la version
const handleUserUpdated = (updatedUser: any) => {
  setUser(updatedUser);
  setProfileVersion(v => v + 1); // ← FORCE LE RECHARGEMENT
};
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
         onUserUpdated={(updatedUser) => {
    setUser(updatedUser);
    setProfileVersion(v => v + 1);
  }}
        profileCompletion={profileCompletion}
      />
    ) : (
      <DashboardHome
       key={profileVersion}
  goSection={goSection}
  userName={user?.name || "Student"}
  user={user}
  profileCompletion={profileCompletion}
  bacAverage={Number(user?.bac_average || 0)}
  universitiesMatched={universitiesMatched}
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


