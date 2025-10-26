import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Aurora from "@/components/Aurora";

export const metadata = {
  title: "ArbiBase Portal — Sign in",
  description:
    "Secure access to the ArbiBase operator portal. Accounts are provisioned by administrators.",
};

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#071019] text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <Aurora {...({ opacity: 0.7 } as any)} />
      </div>

      {/* Header */}
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-6">
        <Link
          href="https://arbibase.com"
          className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
          aria-label="ArbiBase website"
        >
          {/* Swap to your SVG if you prefer */}
          <Image
            src="/arbibase-logo.svg"
            alt="ArbiBase"
            width={140}
            height={28}
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <Link href="https://arbibase.com" className="hover:text-white">
            Website
          </Link>
          <Link href="https://arbibase.com/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="https://arbibase.com/contact" className="hover:text-white">
            Contact
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto grid w-full max-w-[1100px] place-items-center px-6 py-10 md:py-20">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-xl"
        >
          <div className="rounded-2xl border border-[#1b2836] bg-[#0b141d]/85 backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(15,23,42,0.55)]">
            <div className="p-8 md:p-10">
              <div className="mb-6 flex w-full items-center justify-center">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-block rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/20">
                    Portal
                  </span>
                </div>
              </div>

              <h1 className="text-center text-2xl md:text-3xl font-extrabold tracking-tight">
                ArbiBase Portal
              </h1>
              <p className="mt-2 text-center text-slate-300">
                Secure access to your operator dashboard and tools.
              </p>

              <div className="mt-8 flex w-full justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl bg-linear-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-sky-400"
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

              <div className="mt-8 grid grid-cols-1 gap-3 text-[11px] text-slate-400/90 md:grid-cols-3">
                <div className="rounded-lg border border-[#162332] bg-[#0b141d] px-3 py-2 text-center">
                  SSO Ready
                </div>
                <div className="rounded-lg border border-[#162332] bg-[#0b141d] px-3 py-2 text-center">
                  Role-Based Access
                </div>
                <div className="rounded-lg border border-[#162332] bg-[#0b141d] px-3 py-2 text-center">
                  Audit & Logs
                </div>
              </div>
            </div>
          </div>

          {/* Footer row */}
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
        </motion.section>
      </main>
    </div>
  );
}
