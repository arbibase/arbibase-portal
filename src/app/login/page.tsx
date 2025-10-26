"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import {
  LockSimple,
  EnvelopeSimple,
  Lock,
  Eye,
} from "@phosphor-icons/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    if (!supabase) {
      setErr("Supabase client not initialized");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setErr(error.message);
    else location.href = "/dashboard";

    setBusy(false);
  }

  const bg =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-[#071019] text-white">
      {/* Same header as the main page */}
      <Header />

      {/* Hero backdrop */}
      <section
        className="relative isolate flex min-h-[85vh] items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(7,16,25,.72), rgba(7,16,25,.92)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* ambient glows */}
        <div className="pointer-events-none absolute -top-16 -right-24 h-104 w-104 rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-sky-500/15 blur-[100px]" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/8 p-8 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.5)] md:p-10">
          {/* Verified badge */}
          <div className="mb-4 flex items-center justify-center gap-2 text-emerald-300">
            <LockSimple size={18} weight="bold" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Verified Access
            </span>
          </div>

          <h1 className="text-center text-3xl font-extrabold leading-tight md:text-4xl">
            Operator Access
          </h1>
          <p className="mt-2 text-center text-sm text-slate-300/90 md:text-base">
            Use your ArbiBase credentials to sign in.
          </p>

          {/* Form */}
          <form onSubmit={signIn} className="mt-6 grid gap-3">
            {/* Email */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/70">
                <EnvelopeSimple size={18} />
              </span>
              <input
                className="input pl-10"
                placeholder="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/70">
                <Lock size={18} />
              </span>
              <input
                className="input pl-10 pr-10"
                placeholder="Password"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300/70 hover:text-white"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                <Eye size={18} />
              </button>
            </div>

            {err && (
              <div className="mt-1 text-sm text-rose-300">{err}</div>
            )}

            <button
              className="glow-in mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-300"
              disabled={busy}
              type="submit"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Meta */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Admin-only accounts. No self-signups.</span>
            <a
              href="https://www.arbibase.com/pricing/"
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 hover:text-white"
            >
              See plans
            </a>
          </div>

          <p className="mt-6 text-center text-[12px] text-slate-500">
            © {new Date().getFullYear()} ArbiBase. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
