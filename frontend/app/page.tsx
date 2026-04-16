import Link from "next/link";
import { LogoMark } from "@/app/components/logo-mark";

export default function HomePage() {
  return (
    <main className="galaxy-landing relative min-h-screen overflow-hidden">
      <div className="galaxy-stars pointer-events-none absolute inset-0" />
      <div className="route-map" />
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-4rem] top-10 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute left-[14%] top-[68%] h-44 w-44 rounded-full bg-amber-200/16 blur-3xl" />
      <div className="pointer-events-none absolute right-[12%] top-[20%] h-48 w-48 rounded-full bg-orange-200/12 blur-3xl" />

      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-8 md:px-10">
        <header className="mb-16 flex items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_24px_rgba(40,105,230,0.4)] ring-1 ring-white/20">
              <LogoMark className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">EduPath</span>
          </div>
        </header>

        <section className="my-auto">
          <div className="glass-panel rounded-[2rem] px-8 py-12 text-center md:px-14 md:py-16" style={{ caretColor: "transparent" }}>
            <p className="mx-auto mb-5 inline-block rounded-full border border-cyan-200/25 bg-cyan-200/8 px-3 py-1 text-sm text-cyan-100">
              AI Orientation Platform
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              Find Your Best
              <br />
              <span className="bg-gradient-to-r from-cyan-100 via-sky-200 to-amber-100 bg-clip-text text-transparent">University Path</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-blue-200">
              Clear guidance after BAC, without confusion.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="glow-btn rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white">
                Let&apos;s Get Started
              </Link>
              <Link href="/register" className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20">
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
