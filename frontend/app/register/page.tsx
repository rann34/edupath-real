"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const formData = new FormData(e.currentTarget);
    const formName = String(formData.get("name") ?? "").trim();
    const formEmail = String(formData.get("email") ?? "").trim().toLowerCase();
    const formPassword = String(formData.get("password") ?? "").trim();

    setName(formName);
    setEmail(formEmail);
    setPassword(formPassword);

    if (!formName || !formEmail || !formPassword) {
      setErr("Donnees manquantes.");
      return;
    }
    setLoading(true);

    try {
      const data = await api("/register", {
        method: "POST",
        body: { name: formName, email: formEmail, password: formPassword },
      });
      setToken(data.token, remember);
      router.push("/dashboard");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="gradient-bg relative flex min-h-screen items-center justify-center p-4">
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-100 transition hover:bg-white/20"
      >
        {"<-"} Back to Home
      </Link>
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-3xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-blue-300">Start your EduPath journey</p>
          </div>

          <form onSubmit={submit} className="space-y-4" autoComplete="off">
            <div>
              <label className="mb-2 block text-sm font-medium text-blue-200">Full Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                placeholder="Nom complet"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-blue-200">Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                placeholder="mail"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-blue-200">Password</label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                placeholder="At least 6 characters"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-blue-200">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4"
              />
              Keep me signed in
            </label>

            {err ? <div className="rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100">{err}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="glow-btn w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-blue-300">
            Already have an account?{" "}
            <button type="button" onClick={() => router.push("/login")} className="font-medium text-blue-400 hover:text-blue-300">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
