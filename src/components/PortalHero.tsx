"use client";

import Link from "next/link";
import Image from "next/image";
import {
  LockSimple,
  Buildings,
  Gauge,
  ChartLineUp,
  ShieldCheck,
  UsersThree,
  Lightning,
  FileText,
} from "@phosphor-icons/react";

export default function PortalHero() {
  // You can switch to "/hero-apt.jpg" if you prefer a local asset
  const bg =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop";

  return (
    <>
      {/* ------------------ HERO ------------------ */}
      <section
        className="relative isolate flex min-h-[85vh] flex-col items-center justify-center overflow-hidden text-white"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(7,16,25,0.72), rgba(7,16,25,0.92)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-16 -right-24 h-104 w-104 rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-sky-500/15 blur-[100px]" />

        {/* Centered glass card */}
        <div className="relative z-10 mx-auto grid w-full max-w-[980px] place-items-center px-6 py-16 md:py-24">
          <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.5)]">
            <div className="p-8 md:p-10">
              {/* Verified badge */}
              {/* Verified badge */}
              <div className="mb-5 flex items-center justify-center gap-2 text-emerald-300">
                <LockSimple size={18} weight="bold" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Verified Access
                </span>
              </div>
              <h1 className="text-center text-3xl font-extrabold leading-tight md:text-4xl">
                ArbiBase Portal
              </h1>
              <p className="mt-3 text-center text-base text-slate-300/90 md:text-lg">
                Secure access to your operator dashboard and tools for STR &amp; MTR
                arbitrage.
              </p>

              {/* Primary CTAs */}
              <div className="mt-8 flex justify-center gap-3">
                <Link
                  href="/login"
                  data-event="login-attempt"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,.28)] transition-all hover:bg-emerald-600 hover:shadow-[0_0_32px_rgba(16,185,129,.38)] focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  Enter Portal
                </Link>

                <a
                  href="#inside"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  Learn more
                </a>
              </div>

              {/* Quick trust chips */}
              <div className="mt-6 grid grid-cols-1 gap-3 text-slate-300/85 sm:grid-cols-3">
                <Chip icon={<ShieldCheck size={16} />} label="SSO Ready" />
                <Chip icon={<UsersThree size={16} />} label="Role-based Access" />
                <Chip icon={<FileText size={16} />} label="Audit & Logs" />
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

      {/* ------------- WHAT’S INSIDE / SHOWCASE ------------- */}
      <section id="inside" className="bg-[#0a141d] py-16 md:py-20">
        <div className="mx-auto max-w-[980px] px-6">
          <header className="mb-8 text-center md:mb-10">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              What’s inside the portal
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
              Everything you need to scale your STR/MTR business — powered by verified
              data and seamless workflows.
            </p>
          </header>

          {/* Feature grid */}
          <div className="grid gap-5 md:grid-cols-3">
            <Card
              icon={<Buildings size={24} weight="duotone" />}
              title="Verified Properties"
              desc="Curated inventory for rental arbitrage with owner/manager contact and deal tracking."
              accent="emerald"
            />
            <Card
              icon={<Gauge size={24} weight="duotone" />}
              title="Operator Dashboard"
              desc="Manage deals, tasks, and teams with least-privilege roles and audit history."
              accent="sky"
            />
            <Card
              icon={<ChartLineUp size={24} weight="duotone" />}
              title="Insights & Reports"
              desc="Market performance, occupancy, and profitability benchmarks — in real time."
              accent="violet"
            />
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,.28)] transition-all hover:bg-emerald-600 hover:shadow-[0_0_32px_rgba(16,185,129,.38)] focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Proceed to Portal <Lightning size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- Small subcomponents ---------- */

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Card({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "emerald" | "sky" | "violet";
}) {
  const theme =
    {
      emerald: "from-emerald-400/10 to-emerald-400/5 border-emerald-400/20",
      sky: "from-sky-400/10 to-sky-400/5 border-sky-400/20",
      violet: "from-violet-400/10 to-violet-400/5 border-violet-400/20",
    }[accent] || "from-white/5 to-white/0 border-white/10";

  return (
    <article className={`group relative overflow-hidden rounded-2xl border ${theme} bg-linear-to-b p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.06)]`}>
      <div className="mb-3 text-white/90">{icon}</div>
      <h3 className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-300/90">{desc}</p>
    </article>
  );
}
