"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { LockSimple, Eye, EyeSlash, EnvelopeSimple } from "@phosphor-icons/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const bg = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop";

  useEffect(() => {
    console.log("Supabase initialized:", !!supabase);
    (async () => {
      if (!supabase) {
        console.error("Supabase client not initialized");
        setCheckingAuth(false);
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("Session check:", { hasSession: !!data?.session, error });
        if (data?.session) {
          const redirect = searchParams?.get('redirect') || '/dashboard';
          console.log("Already logged in, redirecting to:", redirect);
          router.push(redirect);
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router, searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("Login attempt:", { email: email.trim() });

    try {
      if (!supabase) {
        throw new Error("Authentication service not available");
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      console.log("Login result:", { 
        success: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message 
      });

      if (error) {
        throw error;
      }

      if (data?.session && data?.user) {
        console.log("Login successful! Session:", data.session);
        
        // Wait longer for cookies to be set
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const redirect = searchParams?.get('redirect') || '/dashboard';
        console.log("Redirecting to:", redirect);
        
        // Force a hard reload to ensure cookies are sent
        window.location.href = redirect;
      } else {
        throw new Error("No session created");
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden text-white"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(7,16,25,.85), rgba(7,16,25,.95)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-white/70">Checking authentication...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden text-white px-4"
      style={{
        backgroundImage: `linear-gradient(to bottom right, rgba(7,16,25,.85), rgba(7,16,25,.95)), url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute -top-16 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-sky-500/15 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,.65)] p-8">
          {/* Verified Access Badge */}
          <div className="mb-5 flex items-center justify-center gap-2 text-emerald-300">
            <LockSimple size={18} weight="bold" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Verified Access
            </span>
          </div>

          {/* Title */}
          <h1 className="text-center text-2xl font-extrabold mb-2">
            Operator Access
          </h1>
          <p className="text-center text-sm text-white/70 mb-6">
            Use your ArbiBase credentials to sign in.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Supabase Status */}
          {!supabase && (
            <div className="mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-300">
              ⚠️ Auth service not configured. Check your .env.local file.
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                <EnvelopeSimple size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@arbibase.com"
                className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                <LockSimple size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-12 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                tabIndex={-1}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !supabase}
              className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,.28)] transition-all hover:bg-emerald-600 hover:shadow-[0_0_32px_rgba(16,185,129,.38)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-6 space-y-2 text-center text-xs text-white/50">
            <p>Admin-only accounts. No self-signups.</p>
            <Link href="https://www.arbibase.com/pricing" className="text-sky-400 hover:text-sky-300">
              See plans
            </Link>
          </div>

          <p className="mt-4 text-center text-[11px] text-white/40">
            © {new Date().getFullYear()} ArbiBase. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#071019]">
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
