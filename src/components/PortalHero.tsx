"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock, LayoutDashboard } from "lucide-react";

export default function PortalHero() {
  const bg =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop";

  return (
    <section className="relative isolate min-h-[72vh] w-full overflow-hidden">
      <Image src={bg} alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-b from-black/65 via-black/55 to-[#071019]/92" />
      <div className="absolute inset-0 pointer-events-none [box-shadow:inset_0_0_120px_40px_rgba(0,0,0,0.45)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[980px] place-items-center px-6 py-16 md:py-24">
        <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.5)]">
          <div className="p-8 md:p-10">
            <div className="mb-4 flex items-center justify-center gap-2 text-emerald-300">
              <Lock className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Verified Access
              </span>
            </div>

            <h1 className="text-center text-3xl md:text-4xl font-extrabold leading-tight text-white">
              ArbiBase Portal
            </h1>
            <p className="mt-3 text-center text-slate-300/90 text-base md:text-lg">
              Secure access to your operator dashboard and tools for STR &amp; MTR arbitrage.
            </p>

            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Enter Portal <span aria-hidden>→</span>
              </Link>
              <Link
                href="#inside"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Learn more
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 text-slate-300/80 sm:grid-cols-3">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <span className="text-xs">SSO Ready</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <LayoutDashboard className="h-4 w-4 text-sky-300" />
                <span className="text-xs">Role-based Access</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <Lock className="h-4 w-4 text-purple-300" />
                <span className="text-xs">Audit & Logs</span>
              </div>
            </div>

            <p className="mt-5 text-center text-[12px] text-slate-400">
              Don’t have an account?{" "}
              <span className="text-slate-300">
                Accounts are created by your workspace administrator.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Inside() {
  const items = [
    {
      // Updated wording to reflect exclusivity & accuracy
      title: "Verified Partners & Properties",
      body:
        "Exclusive operator access to pre-approved, arbitrage-friendly opportunities shared through the ArbiBase partner network. Availability varies by market.",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
    },
    {
      title: "Operator Dashboard",
      body:
        "Manage deals, tasks, and teams with least-privilege roles and audit history.",
      icon: <LayoutDashboard className="h-5 w-5 text-sky-400" />,
    },
    {
      title: "Insights & Reports",
      body:
        "Market performance, occupancy, and profitability benchmarks — in real time.",
      icon: <Lock className="h-5 w-5 text-purple-400" />,
    },
  ];

  return (
    <section id="inside" className="bg-[#0a141d] py-16">
      <div className="container mx-auto max-w-[980px] px-6">
        <h2 className="mb-6 text-2xl font-bold text-white">What’s inside the portal</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-xl border border-white/10 bg-[#0d1b26] p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]"
            >
              <div className="mb-3">{it.icon}</div>
              <h3 className="font-semibold text-white">{it.title}</h3>
              <p className="mt-2 text-sm text-slate-300/90">{it.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Proceed to Portal <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
