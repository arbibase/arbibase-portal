// src/components/PortalHero.tsx
import Link from "next/link";
import Image from "next/image";

export default function PortalHero() {
  const bg =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"; // modern apartment interior

  return (
    <>
      {/* --- Hero Section --- */}
      <section
        className="relative isolate flex min-h-[85vh] flex-col items-center justify-center text-white overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(7,16,25,0.7), rgba(7,16,25,0.9)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Decorative glow gradients */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-500/20 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          {/* Subheader badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path d="M7 10V7a5 5 0 0110 0v3" />
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
              />
            </svg>
            Verified Access Portal
          </div>

          {/* Main headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-[46px]">
            Welcome to <span className="text-emerald-400">ArbiBase</span>
          </h1>
          <p className="mt-3 text-lg text-slate-300 md:text-xl">
            The verified property layer for STR &amp; MTR operators. <br />
            Your command center for verified arbitrage operations.
          </p>

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-semibold text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-200 hover:bg-emerald-600 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Enter Portal
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Quick value points */}
          <div className="mt-14 grid grid-cols-1 gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <Feature
              icon="🏠"
              title="Verified Properties"
              subtitle="Curated for arbitrage use"
            />
            <Feature
              icon="📊"
              title="Operator Dashboard"
              subtitle="Manage deals & metrics"
            />
            <Feature
              icon="🧠"
              title="Insight Reports"
              subtitle="Real-time performance data"
            />
          </div>
        </div>
      </section>

      {/* --- Showcase Section --- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24 text-center text-slate-200">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          What’s Inside the Portal
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Everything you need to scale your STR/MTR business — powered by verified data and seamless workflows.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <ShowcaseCard
            title="Verified Property Database"
            desc="Instant access to pre-vetted homes, apartments, and spaces approved for rental arbitrage."
            icon="🏙️"
            accent="emerald"
          />
          <ShowcaseCard
            title="Owner & Manager Connect"
            desc="Contact verified property owners and negotiate flexible lease terms directly within your portal."
            icon="🤝"
            accent="sky"
          />
          <ShowcaseCard
            title="Deal Pipeline"
            desc="Track, tag, and analyze properties under negotiation with real-time updates and status stages."
            icon="📈"
            accent="indigo"
          />
          <ShowcaseCard
            title="Compliance & Docs"
            desc="Centralize contracts, insurance, and local regulations for quick audits and peace of mind."
            icon="📂"
            accent="violet"
          />
          <ShowcaseCard
            title="Performance Insights"
            desc="View occupancy trends, profit margins, and revenue benchmarks across markets."
            icon="💹"
            accent="rose"
          />
          <ShowcaseCard
            title="Support & Growth"
            desc="Access coaching tools, community updates, and priority support for premium users."
            icon="⚡"
            accent="amber"
          />
        </div>

        {/* CTA bottom */}
        <div className="mt-16">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-semibold text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-200 hover:bg-emerald-600 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Proceed to Portal
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </>
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
      className={`group relative overflow-hidden rounded-2xl border ${color} bg-gradient-to-b p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]`}
    >
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </div>
  );
}
