"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, Eye, EyeOff, Loader2, User, CheckCircle2, AlertCircle } from "lucide-react";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function validEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!supabase) {
      setMsg({ type: "error", text: "Authentication client not initialized. Please try again later." });
      return;
    }
    if (!validEmail(email)) {
      setMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: fullName.trim(), role: "operator" } },
        });
        if (error) throw error;
        setMsg({ type: "success", text: "Check your email to confirm your account." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        location.href = "/dashboard";
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function onForgot() {
    setMsg(null);
    if (!supabase) {
      setMsg({ type: "error", text: "Authentication client not initialized. Please try again later." });
      return;
    }
    if (!validEmail(email)) {
      setMsg({ type: "error", text: "Enter your email above and try again." });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset`,
      });
      if (error) throw error;
      setMsg({ type: "success", text: "Password reset link sent. Check your inbox." });
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message ?? String(err) });
    }
  }

  return (
    <main className="relative min-h-[82vh]">
      {/* soft brand glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-120px] h-[220px] w-[380px] -translate-x-1/2 rounded-full bg-gradient-radial from-[color:var(--brand-primary,#10B981)]/18 via-transparent to-transparent blur-2xl" />
        <div className="absolute right-[8%] top-[40%] h-[160px] w-[160px] rounded-full bg-gradient-radial from-[color:var(--brand-accent,#F59E0B)]/18 via-transparent to-transparent blur-2xl" />
      </div>

      <div className="container mx-auto max-w-md px-4 py-12">
        {/* Card */}
        <div className="card" style={{ borderRadius: "16px" }}>
          <div className="card-body" style={{ padding: 22 }}>
            {/* Tabs */}
            <div className="mb-4 inline-flex rounded-xl border border-[var(--border)] p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                  mode === "login"
                    ? "bg-[var(--panel-2)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                  mode === "signup"
                    ? "bg-[var(--panel-2)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Create account
              </button>
            </div>

            <h1 className="text-2xl font-bold">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {mode === "login"
                ? "Access your operator portal."
                : "It takes less than a minute."}
            </p>

            {/* Alert */}
            {msg && (
              <div
                className="mt-3 flex items-start gap-2 rounded-lg border p-2"
                style={{
                  borderColor: msg.type === "error" ? "#7f1d1d" : "#1f5133",
                  background:
                    msg.type === "error"
                      ? "rgba(127,29,29,.15)"
                      : "rgba(31,81,51,.15)",
                }}
              >
                {msg.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <p className="text-sm">{msg.text}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-4 grid gap-3">
              {mode === "signup" && (
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold">Full name</span>
                  <div className="flex items-center gap-2 rounded-lg border border-[#2a3441] bg-[#0f141c] px-3 py-2">
                    <User className="h-4 w-4 opacity-70" />
                    <input
                      className="w-full bg-transparent outline-none"
                      placeholder="Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </label>
              )}

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold">Email</span>
                <div className="flex items-center gap-2 rounded-lg border border-[#2a3441] bg-[#0f141c] px-3 py-2">
                  <Mail className="h-4 w-4 opacity-70" />
                  <input
                    className="w-full bg-transparent outline-none"
                    placeholder="you@arbibase.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold">Password</span>
                <div className="flex items-center gap-2 rounded-lg border border-[#2a3441] bg-[#0f141c] px-3 py-2">
                  <Lock className="h-4 w-4 opacity-70" />
                  <input
                    className="w-full bg-transparent outline-none"
                    placeholder="••••••••"
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="opacity-80 transition hover:opacity-100"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={onForgot}
                    className="self-end text-xs underline opacity-80 hover:opacity-100"
                  >
                    Forgot password?
                  </button>
                )}
              </label>

              <button
                className="btn primary mt-2 inline-flex items-center justify-center gap-2"
                type="submit"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Login" : "Create account"}
              </button>
            </form>

            <div className="mt-4 text-sm">
              {mode === "login" ? (
                <button
                  onClick={() => setMode("signup")}
                  className="underline"
                >
                  Create an account
                </button>
              ) : (
                <button
                  onClick={() => setMode("login")}
                  className="underline"
                >
                  I already have an account
                </button>
              )}
            </div>

            <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
              By continuing, you agree to our{" "}
              <a href="/terms-of-service" className="underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy-policy" className="underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
