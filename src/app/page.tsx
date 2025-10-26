import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ArbiBase Portal – Secure Sign-In for STR/MTR Operators",
  description:
    "Log in to the ArbiBase Portal to access verified property inventory, tools, and operator dashboards.",
  openGraph: {
    title: "ArbiBase Portal – Secure Sign-In for STR/MTR Operators",
    description:
      "Log in to the ArbiBase Portal to access verified property inventory, tools, and operator dashboards.",
    url: "https://arbibase-portal.vercel.app/",
    siteName: "ArbiBase",
    images: [{ url: "/og-portal.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function Home() {
  // royalty-free interior image (blurred via overlay); using CSS bg, not <Image>, to avoid remote config
  const bg =
    "https://images.unsplash.com/photo-1505692794403-34d4982f88aa?q=80&w=1600&auto=format&fit=crop";

  return (
    <div className="min-h-dvh bg-[#0a121b] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#0a121b]/60 border-b border-white/5">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <Link
            href="https://arbibase.com"
            aria-label="ArbiBase website"
            className="inline-flex items-center gap-2"
          >
            {/* Your SVG in /public/arbibase-logo.svg */}
            <Image
              src="/arbibase-logo.svg"
              alt="ArbiBase"
              width={132}
              height={28}
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link href="https://arbibase.com" className="hover:text-white underline-offset-4 hover:underline">Home</Link>
            <Link href="https://arbibase.com/faq" className="hover:text-white underline-offset-4 hover:underline">FAQ</Link>
            <Link href="https://arbibase.com/support" className="hover:text-white underline-offset-4 hover:underline">Support</Link>
          </nav>

          <div
            className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
            aria-label="Secure Access"
            title="Secure Access"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-90">
              <path d="M7 10V7a5 5 0 1110 0v3" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Secure Access
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative isolate overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10,18,27,0.55), rgba(10,18,27,0.85)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 lg:grid-cols-2 gap-10 px-6 py-16 lg:py-24">
          {/* Left: Headline */}
          <div className="order-2 lg:order-1 self-center">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-[40px] leading-tight">
              ArbiBase Portal
            </h1>
            <p className="mt-3 text-slate-200 text-lg">
              Secure access to your operator dashboard and tools.
            </p>

            {/* Trust row */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-300/90">
              <span className="inline-flex items-center gap-2 rounded-md bg-black/30 px-3 py-1 ring-1 ring-white/10">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Uptime 99.9%
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-black/30 px-3 py-1 ring-1 ring-white/10">
                HTTPS
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-black/30 px-3 py-1 ring-1 ring-white/10">
                GDPR Compliant
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-black/30 px-3 py-1 ring-1 ring-white/10">
                SOC 2 In Progress
              </span>
            </div>
          </div>

          {/* Right: Login card (links to /login) */}
          <div className="order-1 lg:order-2">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white text-slate-900 shadow-2xl">
              <div className="p-7 md:p-8">
                <div className="mb-6 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Portal
                  </span>
                </div>

                <h2 className="text-center text-2xl font-bold">Sign in</h2>
                <p className="mt-1 text-center text-sm text-slate-600">
                  Access for Operators &amp; Premium Coaches
                </p>

                {/* This card only routes to /login where your actual form lives */}
                <form action="/login" method="get" className="mt-6">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Email
                      </span>
                      <input
                        type="email"
                        name="email"
                        inputMode="email"
                        autoComplete="email"
                        aria-label="Email address"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] outline-none ring-emerald-400/30 focus:ring-2"
                        placeholder="you@company.com"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Password
                      </span>
                      <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        aria-label="Password"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] outline-none ring-emerald-400/30 focus:ring-2"
                        placeholder="••••••••"
                        required
                      />
                    </label>

                    <div className="flex items-center justify-between">
                      <Link
                        href="/forgot"
                        className="text-sm text-[#2196F3] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <button
                      data-event="login-attempt"
                      className="mt-1 w-full rounded-lg bg-[#4CAF50] px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      Sign In
                    </button>
                  </div>
                </form>

                <p className="mt-4 text-center text-xs text-slate-600">
                  Don’t have an account?{" "}
                  <span className="font-medium text-slate-700">
                    Accounts are created by your workspace administrator.
                  </span>
                </p>
              </div>
            </div>

            {/* Features under the card */}
            <div className="mx-auto mt-6 grid w-full max-w-md grid-cols-1 gap-3 text-[13px] text-slate-200/90 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  SSO Ready
                </div>
                <p className="mt-1 text-xs text-slate-300/80">
                  Works with Google Workspace / Okta.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M8 7a4 4 0 118 0v3h-2V7a2 2 0 10-4 0v3H8V7Z" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Role-Based Access
                </div>
                <p className="mt-1 text-xs text-slate-300/80">
                  Least-privilege controls for teams.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4h12v16H6z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 8h6M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Audit & Logs
                </div>
                <p className="mt-1 text-xs text-slate-300/80">
                  Track important events and changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance / links */}
      <section className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Two-Factor Auth Available
          </span>
          <Link href="/security" className="text-[#2196F3] hover:underline">
            Learn more about our security
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-3 px-6 py-8 text-sm text-slate-400 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} ArbiBase. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="https://arbibase.com/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="https://arbibase.com/terms" className="hover:text-white">Terms of Service</Link>
            <span className="opacity-50">•</span>
            <Link href="https://twitter.com" className="text-[#2196F3] hover:underline">Twitter</Link>
            <Link href="https://linkedin.com/company/arbibase" className="text-[#2196F3] hover:underline">LinkedIn</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
