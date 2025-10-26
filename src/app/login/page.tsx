"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import {
  LockSimple,
  EnvelopeSimple,
  Lock,
  Eye,
} from "@phosphor-icons/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    // Check if already logged in
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const redirect = searchParams?.get('redirect') || '/dashboard';
        router.replace(redirect);
      }
    })();
  }, [router, searchParams]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      if (!supabase) throw new Error("Auth not initialized");
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to intended destination or dashboard
      const redirect = searchParams?.get('redirect') || '/dashboard';
      router.replace(redirect);
    } catch (err: any) {
      setErr(err.message || "Failed to sign in");
    } finally {
      setBusy(false);
    }
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
            <div className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <div className="flex items-center">
                {/* Icon rail */}
                <div className="w-11 h-10 grid place-items-center border-r border-white/10 text-slate-300/80">
                  <EnvelopeSimple size={18} />
                </div>
                {/* Input */}
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-white placeholder-white/50 outline-none
                             focus-visible:ring-2 focus-visible:ring-emerald-400/30 focus-visible:border-emerald-400/40"
                  aria-label="Email address"
                />
              </div>
            </div>

            {/* Password */}
            <div className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <div className="flex items-center">
                {/* Icon rail */}
                <div className="w-11 h-10 grid place-items-center border-r border-white/10 text-slate-300/80">
                  <Lock size={18} />
                </div>
                {/* Input */}
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-white placeholder-white/50 outline-none
                             focus-visible:ring-2 focus-visible:ring-emerald-400/30 focus-visible:border-emerald-400/40"
                  aria-label="Password"
                />
                {/* Eye toggle */}
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="w-11 h-10 grid place-items-center text-slate-300/75 hover:text-white"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>

            {err && <div className="mt-1 text-sm text-rose-300">{err}</div>}

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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
