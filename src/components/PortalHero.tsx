// src/components/PortalHero.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PortalHero() {
  return (
    <section className="relative flex min-h-[82vh] items-center justify-center px-4">
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[10%] h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/25 blur-[90px]" />
        <div className="absolute right-[10%] bottom-[12%] h-72 w-72 rounded-full bg-indigo-500/20 blur-[110px]" />
        <div className="absolute left-[8%] bottom-[20%] h-56 w-56 rounded-full bg-cyan-400/20 blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[520px]"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(2,8,23,0.6)]">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
          <div className="p-8 md:p-10">
            <div className="mb-6 flex justify-center">
              <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/20">
                Portal
              </span>
            </div>

            <h1 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight">
              ArbiBase Portal
            </h1>
            <p className="mt-3 text-center text-slate-300">
              Secure access to your operator dashboard and tools.
            </p>

            <div className="mt-8">
              <Link
                href="/login"
                className="group inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 to-indigo-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-sky-900/30 outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Login"
              >
                Login
              </Link>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400">
              Don’t have an account?{" "}
              <span className="text-slate-300">
                Accounts are created by your workspace administrator.
              </span>
            </p>

            {/* small trust badges */}
            <div className="mt-8 grid grid-cols-1 gap-3 text-[11px] text-slate-400/90 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                SSO Ready
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                Role-Based Access
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                Audit &amp; Logs
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        </div>

        {/* tiny footer links under card */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="https://arbibase.com/terms" className="hover:text-white">
            Terms
          </Link>
          <span className="opacity-30">•</span>
          <Link href="https://arbibase.com/privacy" className="hover:text-white">
            Privacy
          </Link>
          <span className="opacity-30">•</span>
          <Link href="https://status.arbibase.com" className="hover:text-white">
            Status
          </Link>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} ArbiBase. All rights reserved.
        </p>
      </motion.div>
    </section>
  );
}
