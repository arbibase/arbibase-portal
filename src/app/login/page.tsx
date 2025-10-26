"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LockSimple,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  ShieldCheck,
} from "@phosphor-icons/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const bg =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop";

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

  return (
    <main
      className="relative min-h-dvh text-white isolate overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom right, rgba(7,16,25,.78), rgba(7,16,25,.92)), url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* soft ambient glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-sky-500/15 blur-[100px]" />

      {/* Top bar with logo back to home */}
      <header className="relative z-10 mx-auto flex max-w-[980px] items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Back to ArbiBase Portal" className="flex items-center gap-2">
          {/* tiny “A” logo mark – reuse same SVG styling as the landing header logo */}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#071019] font-black">A</span>
          <span className="text-sm font-semibold text-white/90">ArbiBase</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-slate-300">
          <a className="hover:text-white" href="https://www.arbibase.com/about-us">About</a>
          <a className="hover:text-white" href="https://www.arbibase.com/pricing/">Pricing</a>
          <a className="hover:text-white" href="https://www.arbibase.com/about-us#contact">Contact</a>
        </nav>
      </header>

      {/* Centered card */}
      <section className="relative z-10 grid place-items-center px-6">
        <div className="w-full max-w-[480px] rounded-2xl border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,.55)] p-6 sm:p-8 my-10">
          {/* Verified pill */}
          <div className="mb-6 flex items-center justify-center gap-2 text-emerald-300">
            <LockSimple size={18} weight="bold" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              Verified Access
            </span>
          </div>

          <h1 className="text-center text-2xl sm:text-3xl font-extrabold leading-tight">
            Operator Access
          </h1>
          <p className="mt-2 text-center text-sm text-slate-300/90">
            Use your ArbiBase credentials to sign in.
          </p>

          {/* form */}
          <form onSubmit={signIn} className="mt-6 grid gap-3" aria-label="Sign in form">
            {/* Email */}
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/70">
                <EnvelopeSimple size={18} />
              </span>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input pl-10"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!err}
              />
            </div>

            {/* Password */}
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/70">
                <ShieldCheck size={18} />
              </span>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete="current-password"
                className="input pr-10 pl-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!err}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-white/70 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error */}
            {!!err && (
              <div
                role="alert"
                className="mt-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-200"
              >
                {err}
              </div>
            )}

            {/* Actions */}
            <button
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,.28)] transition-all hover:bg-emerald-600 hover:shadow-[0_0_32px_rgba(16,185,129,.38)] focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
              disabled={busy}
              type="submit"
              data-event="login-submit"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              {/* Optional Forgot link (route stub) */}
              <span className="opacity-80">
                Admin-only accounts.{" "}
                <span className="text-slate-300">No self-signups.</span>
              </span>
              <Link href="/pricing" className="text-sky-300 hover:text-sky-200">
                See plans
              </Link>
            </div>
          </form>
        </div>
      </section>

      {/* minimal footer */}
      <footer className="relative z-10 mx-auto max-w-[980px] px-6 pb-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ArbiBase. All rights reserved.
      </footer>
    </main>
  );
}
