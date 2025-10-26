"use client";

import Link from "next/link";
import { ShieldCheck, Lock, LayoutDashboard } from "lucide-react";

export default function PortalHero() {
  return (
    <section
      className="relative isolate min-h-[72vh] w-full overflow-hidden"
      aria-label="ArbiBase Portal"
    >
      {/* Background image with gradient & vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1505842465776-3f8bd5433473?q=80&w=2000&auto=format&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/65 via-black/55 to-[#071019]/92" />
      <div className="absolute inset-0 pointer-events-none [box-shadow:inset_0_0_120px_40px_rgba(0,0,0,0.45)]" />

      {/* Centered glass card */}
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
              Secure access to your operator dashboard and tools for STR & MTR
              arbitrage.
            </p>

            {/* Primary CTA */}
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/login"
                data-event="cta-enter-portal"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Enter Portal
                <span aria-hidden>→</span>
              </Link>

              <Link
                href="#inside"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Learn more
              </Link>
            </div>

            {/* Little assurance row */}
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

      {/* --- Showcase Section --- */}
 export function Inside() {
  const items = [
    {
      title: "Verified Properties",
      body:
        "Curated inventory for rental arbitrage with owner/manager contact and deal tracking.",
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
        <h2 className="text-2xl font-bold text-white mb-6">
          What’s inside the portal
        </h2>

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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Proceed to Portal <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}



/* --- Subcomponents --- */
function Feature({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-2xl">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function ShowcaseCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: string;
  title: string;
  desc: string;
  accent: string;
}) {
  const color = {
    emerald: "from-emerald-400/10 to-emerald-400/5 border-emerald-400/20",
    sky: "from-sky-400/10 to-sky-400/5 border-sky-400/20",
    indigo: "from-indigo-400/10 to-indigo-400/5 border-indigo-400/20",
    violet: "from-violet-400/10 to-violet-400/5 border-violet-400/20",
    rose: "from-rose-400/10 to-rose-400/5 border-rose-400/20",
    amber: "from-amber-400/10 to-amber-400/5 border-amber-400/20",
  }[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${color} bg-linear-to-b p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]`}
    >
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </div>
  );
}
