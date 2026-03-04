"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  async function requestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErr("Email is required.");
      return;
    }

    setLoadingRequest(true);
    try {
      const data = await api("/forgot-password", {
        method: "POST",
        body: { email: normalizedEmail },
      });
      setMsg(data.message || "Reset token generated.");
      if (data.reset_token) {
        setToken(data.reset_token);
      }
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed to generate reset token");
    } finally {
      setLoadingRequest(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!token.trim() || !newPassword.trim()) {
      setErr("Token and new password are required.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    setLoadingReset(true);
    try {
      const data = await api("/reset-password", {
        method: "POST",
        body: { token: token.trim(), new_password: newPassword.trim() },
      });
      setMsg(data.message || "Password updated successfully.");
      setTimeout(() => router.push("/login"), 800);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed to reset password");
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <main className="gradient-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-3xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="mt-1 text-sm text-blue-300">Generate a reset token, then set a new password.</p>
          </div>

          <form onSubmit={requestReset} className="space-y-3">
            <label className="block text-sm text-blue-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
            />
            <button
              type="submit"
              disabled={loadingRequest}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loadingRequest ? "Generating..." : "Generate Reset Token"}
            </button>
          </form>

          <form onSubmit={submitNewPassword} className="mt-6 space-y-3">
            <label className="block text-sm text-blue-200">Reset Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="paste token"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
            />
            <label className="block text-sm text-blue-200">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3"
            />
            <button
              type="submit"
              disabled={loadingReset}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loadingReset ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {err ? <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100">{err}</div> : null}
          {msg ? <div className="mt-4 rounded-lg border border-green-400/30 bg-green-500/15 p-3 text-sm text-green-100">{msg}</div> : null}

          <div className="mt-6 text-center text-sm text-blue-300">
            <Link href="/login" className="text-blue-300 hover:text-blue-200">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
