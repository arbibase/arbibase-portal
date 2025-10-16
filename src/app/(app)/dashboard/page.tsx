"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  Home,
  MapPin,
  CheckCircle2,
  Star,
  Sparkles,
  Compass,
  Inbox,
  Building2,
  CalendarClock,
  Mail,
} from "lucide-react";

/**
 * ArbiBase Dashboard v2
 * - Airbnb/Zillow-inspired, but distinctly ArbiBase: warm neutrals, rounded radii, soft shadows, subtle textures
 * - No external UI library required (just Tailwind + lucide-react icons)
 * - Smooth hover states, micro-interactions, and graceful loading
 */

const quickLinks = [
  {
    title: "Explore verified doors",
    description:
      "Review high-confidence homes and suites that are ready to onboard.",
    href: "/properties",
    cta: "Browse properties",
    icon: Compass,
  },
  {
    title: "Request a property check",
    description:
      "Submit an address and we’ll confirm licensing, HOAs, and local rules for you.",
    href: "/request-verification",
    cta: "Start a request",
    icon: CheckCircle2,
  },
  {
    title: "Keep tabs on favourites",
    description:
      "See every opportunity you’ve starred and how each one is progressing.",
    href: "/favorites",
    cta: "Open favourites",
    icon: Star,
  },
];

const spotlights = [
  {
    name: "The Willow Lofts",
    location: "Capitol Hill • Seattle",
    status: "Newly verified",
    summary:
      "7 furnished units with flexible 6–12 month terms and concierge support.",
    photo:
      "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Riverfront Rowhomes",
    location: "Downtown • Austin",
    status: "Lead refreshed",
    summary:
      "Boutique rowhomes ideal for owner-operators expanding into STR + mid-term.",
    photo:
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c08e?q=80&w=1200&auto=format&fit=crop",
  },
];

const updates = [
  {
    title: "Local compliance team added 4 new city partnerships",
    date: "Today",
    body: "Priority reviews in Denver, San Diego, Miami, and Nashville now complete.",
  },
  {
    title: "Coach marketplace applications reopen next week",
    date: "Yesterday",
    body: "We’ll send you an email when the cohort is live so you can reserve a slot early.",
  },
  {
    title: "Product tip: Collaborate from the pipeline view",
    date: "This week",
    body: "Share shortlists with partners and track comments alongside your saved homes.",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const client = supabase;
    if (!client) {
      router.replace("/login");
      setIsLoading(false);
      return;
    }

    client.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    return () => {
      active = false;
    };
  }, [router]);

  const firstName = useMemo(() => {
    const fullName = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!fullName.trim()) return user?.email?.split("@")[0] || "there";
    return fullName.split(" ")[0];
  }, [user]);

  const stats = useMemo(
    () => [
      { label: "Active leads", value: "18", detail: "+3 this week", icon: Inbox },
      { label: "Verified doors", value: "42", detail: "12 pending", icon: Building2 },
      { label: "Tasks due", value: "2", detail: "Schedule walkthroughs", icon: CalendarClock },
    ],
    []
  );

  if (isLoading) {
    return (
      <main className="relative min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <BackgroundTexture />
        <div className="mx-auto max-w-7xl px-4 py-14">
          <section className="rounded-3xl border border-neutral-200/70 bg-white/70 p-8 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="mb-6 h-6 w-36 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="mb-3 h-10 w-2/3 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="mb-8 h-5 w-1/2 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="relative min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <BackgroundTexture />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:pb-12 sm:pt-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
            <Sparkles className="h-4 w-4" />
            <span>
              {greeting}, <span className="font-medium">{firstName}</span> 👋
            </span>
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Let’s build your next great stay.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-neutral-600 dark:text-neutral-300">
            Curate rentals, track verifications, and collaborate with your team from one welcoming
            place. We’ll surface what needs your attention so you can focus on guest‑ready
            experiences.
          </p>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-radial from-rose-400/20 via-transparent to-transparent blur-2xl" />
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-neutral-100 p-2.5 shadow-sm ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold leading-tight">{stat.value}</div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{stat.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-20 sm:grid-cols-12">
        {/* Quick Actions */}
        <section className="sm:col-span-7">
          <Card>
            <CardHeader
              eyebrow="Your next steps"
              title="Quick actions"
              cta={{ href: "/properties", label: "Jump back in" }}
            />
            <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
              {quickLinks.map((link) => (
                <article
                  key={link.title}
                  className="flex flex-col items-start justify-between gap-4 py-5 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-xl bg-neutral-100 p-2 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium">{link.title}</h3>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        {link.description}
                      </p>
                    </div>
                  </div>
                  <Link
                    className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                    href={link.href}
                  >
                    {link.cta} <ArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          </Card>

          {/* Updates */}
          <Card className="mt-6">
            <CardHeader eyebrow="Team updates" title="What’s new at ArbiBase" />
            <ul className="mt-2 space-y-6">
              {updates.map((update) => (
                <li key={update.title} className="relative pl-6">
                  <span className="absolute left-0 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-sm">
                    <Check />
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{update.date}</p>
                  <h3 className="mt-1 text-sm font-semibold">{update.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{update.body}</p>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Spotlights */}
        <section className="sm:col-span-5">
          <Card>
            <CardHeader eyebrow="Fresh opportunities" title="Spotlight listings" />
            <div className="grid gap-4">
              {spotlights.map((p) => (
                <article
                  key={p.name}
                  className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/60"
                >
                  <div className="relative h-36 w-full overflow-hidden">
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur dark:bg-neutral-900/80 dark:text-neutral-100">
                      <Sparkles className="h-3.5 w-3.5" /> {p.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold tracking-tight">{p.name}</h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                      <MapPin className="h-4 w-4" /> {p.location}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{p.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </Card>

          {/* Support */}
          <Card className="mt-6">
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 p-5 dark:from-neutral-900 dark:to-neutral-900">
              <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Need a hand?
              </p>
              <h2 className="mt-1 text-lg font-semibold">Your concierge team is on standby</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Message us for tailored onboarding help, market insights, or to schedule a strategy
                session. We reply within a business day—usually sooner.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white dark:text-neutral-900"
                  href="mailto:support@arbibase.com"
                >
                  <Mail className="h-4 w-4" /> Email support
                </Link>
                <Link
                  className="inline-flex items-center gap-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
                  href="/request-verification"
                >
                  Book a call <ArrowRight />
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </div>

      <footer className="border-t border-neutral-200/70 bg-white/60 py-6 text-sm text-neutral-500 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <p>© {new Date().getFullYear()} ArbiBase. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-neutral-100">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* -----------------------
 * UI primitives
 * ---------------------*/
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-3xl border border-neutral-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60 " +
        className
      }
    >
      {children}
    </div>
  );
}

function CardHeader({
  eyebrow,
  title,
  cta,
}: {
  eyebrow?: string;
  title: string;
  cta?: { href: string; label: string };
}) {
  return (
    <header className="mb-2 flex items-center justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
        >
          {cta.label} <ArrowRight />
        </Link>
      )}
    </header>
  );
}

function ArrowRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function BackgroundTexture() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Soft grid */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]"
      />
      {/* Glow blobs */}
      <div className="absolute left-1/2 top-[-120px] h-[280px] w-[480px] -translate-x-1/2 rounded-full bg-gradient-radial from-rose-400/25 via-fuchsia-400/10 to-transparent blur-2xl" />
      <div className="absolute right-[10%] top-[30%] h-[200px] w-[200px] rounded-full bg-gradient-radial from-amber-300/30 via-transparent to-transparent blur-2xl" />
      <div className="absolute left-[5%] bottom-[10%] h-[220px] w-[220px] rounded-full bg-gradient-radial from-emerald-300/25 via-transparent to-transparent blur-2xl" />
    </div>
  );
}
