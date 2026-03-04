"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import { LogoMark } from "@/app/components/logo-mark";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api("/me", { token })
      .then(() => router.replace("/dashboard"))
      .catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (!normalizedEmail || !normalizedPassword) {
      setErr("Donnees manquantes.");
      return;
    }
    setLoading(true);
    try {
      const data = await api("/login", { method: "POST", body: { email: normalizedEmail, password: normalizedPassword } });
      setToken(data.token, remember);
      router.push("/dashboard");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function goToRegister() {
    router.push("/register");
  }

  return (
    <main className="gradient-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-100 transition hover:bg-white/20"
      >
        {"<-"} Back to Home
      </Link>
      <div className="pulse-ring absolute left-20 top-20 h-72 w-72 rounded-full bg-blue-500 opacity-10 blur-3xl" />
      <div className="floating absolute bottom-20 right-20 h-96 w-96 rounded-full bg-blue-400 opacity-10 blur-3xl" />
      <div className="absolute left-10 top-1/2 h-32 w-32 rounded-full bg-blue-300 opacity-5 blur-2xl" />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 lg:flex-row">
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
              <LogoMark className="h-8 w-8 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-3xl font-bold text-transparent">EduPath</span>
          </div>

          <h1 className="mb-4 text-4xl font-extrabold leading-tight lg:text-5xl">
            Your Future,
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Guided by AI</span>
          </h1>
          <p className="mb-8 max-w-md text-lg text-blue-200">
            Discover the perfect university path tailored to your skills, interests, and BAC results using advanced artificial intelligence.
          </p>

          <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              100+ Universities
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              AI-Powered
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Free Forever
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="glass-panel rounded-3xl p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">Welcome Back</h2>
              <p className="text-sm text-blue-300">Sign in to continue your journey</p>
            </div>

            <form onSubmit={submit} className="space-y-5" autoComplete="off">
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mail"
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-11 text-white placeholder-blue-300/50 transition-all focus:border-blue-400"
                  />
                  <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="........"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-11 text-white placeholder-blue-300/50 transition-all focus:border-blue-400"
                  />
                  <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-blue-200">Remember me</span>
                </label>
                <button type="button" onClick={() => router.push("/forgot-password")} className="text-blue-400 transition-colors hover:text-blue-300">
                  Forgot password?
                </button>
              </div>

              {err ? <div className="rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100">{err}</div> : null}

              <button type="submit" disabled={loading} className="glow-btn w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-4 font-semibold text-white disabled:opacity-60">
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="mb-4 text-sm text-blue-300">Or continue with</p>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => setErr("Google login not implemented yet")} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 transition-all hover:bg-white/20">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm">Google</span>
                </button>
                <button type="button" onClick={() => setErr("Facebook login not implemented yet")} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 transition-all hover:bg-white/20">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-sm">Facebook</span>
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-blue-300">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={goToRegister} className="font-medium text-blue-400 hover:text-blue-300">
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
