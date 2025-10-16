"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  MapPin,
  CheckCircle2,
  Star,
  Sparkles,
  Compass,
  Inbox,
  Building2,
  CalendarClock,
  Mail,
  ArrowRight,
} from "lucide-react";

/**
 * ArbiBase Dashboard v2.2 — Tidy scale, consistent spacing, single footer
 * - Tightened icon sizing and spacing (no oversized SVGs)
 * - Balanced type scale and section rhythm
 * - Removed local footer to avoid duplicate site footer
 * - Still brand‑tokenized and wired for Supabase data
 */

/** BRAND TOKENS */
const BRAND = {
  primary: "#10B981",
  primarySoft: "#34D399",
  accent: "#F59E0B",
  radius: "16px",
};

/** Types for fetched data */
type Spotlight = {
  name: string;
  location: string;
  status: string;
  summary: string;
  photo?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");
  const [stats, setStats] = useState([
    { label: "Active leads", value: "–", detail: "Loading…", icon: Inbox },
    { label: "Verified doors", value: "–", detail: "Loading…", icon: Building2 },
    { label: "Tasks due", value: "–", detail: "Loading…", icon: CalendarClock },
  ]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const router = useRouter();

  // CSS vars for brand
  useEffect(() => {
    if (typeof document === "undefined") return;
    const r = document.documentElement;
    r.style.setProperty("--brand-primary", BRAND.primary);
    r.style.setProperty("--brand-primary-soft", BRAND.primarySoft);
    r.style.setProperty("--brand-accent", BRAND.accent);
    r.style.setProperty("--brand-radius", BRAND.radius);
  }, []);

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
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const client = supabase;
    if (!client) return;

    (async () => {
      try {
        const { count: leadsCount, error: leadsErr } = await client
          .from("leads")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "working", "new"]);

        const { count: verifiedCount, error: propErr1 } = await client
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("verified", true);

        const { count: pendingOnboardingCount, error: propErr2 } = await client
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("onboarding_status", "pending");

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const { count: tasksDueCount, error: tasksErr } = await client
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .lte("due_date", endOfToday.toISOString())
          .eq("status", "open");

        setStats([
          { label: "Active leads", value: String(leadsErr ? "–" : leadsCount ?? 0), detail: "+ this month", icon: Inbox },
          { label: "Verified doors", value: String(propErr1 ? "–" : verifiedCount ?? 0), detail: propErr2 ? "–" : `${pendingOnboardingCount ?? 0} pending`, icon: Building2 },
          { label: "Tasks due", value: String(tasksErr ? "–" : tasksDueCount ?? 0), detail: "Due today / overdue", icon: CalendarClock },
        ]);

        const { data: spotlightData } = await client
          .from("properties")
          .select("name, city, state, summary:headline, featured, verified, verified_at, photo_url")
          .eq("featured", true)
          .limit(2);

        const mapped: Spotlight[] = (spotlightData || []).map((p: any) => ({
          name: p.name || "Untitled listing",
          location: [p.city, p.state].filter(Boolean).join(" • "),
          status: p.verified ? (recentlyVerified(p.verified_at) ? "Newly verified" : "Verified") : "Lead refreshed",
          summary: p.summary || "Flexible terms, operator-friendly.",
          photo: p.photo_url || undefined,
        }));

        setSpotlights(
          mapped.length
            ? mapped
            : [
                {
                  name: "The Willow Lofts",
                  location: "Capitol Hill • Seattle",
                  status: "Newly verified",
                  summary: "7 furnished units with flexible 6–12 month terms and concierge support.",
                  photo:
                    "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1200&auto=format&fit=crop",
                },
                {
                  name: "Riverfront Rowhomes",
                  location: "Downtown • Austin",
                  status: "Lead refreshed",
                  summary: "Boutique rowhomes ideal for owner-operators expanding into STR + mid-term.",
                  photo:
                    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c08e?q=80&w=1200&auto=format&fit=crop",
                },
              ]
        );
      } catch (e) {
        console.error("Dashboard fetch error", e);
      }
    })();
  }, [user]);

  const firstName = useMemo(() => {
    const fullName = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!fullName.trim()) return user?.email?.split("@")[0] || "there";
    return fullName.split(" ")[0];
  }, [user]);

  if (isLoading) return <Skeleton />;
  if (!user) return null;

  return (
    <main className="relative min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <BrandStyle />
      <BackgroundTexture />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:pb-10 sm:pt-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-1 text-xs shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {greeting}, <span className="font-medium">{firstName}</span> 👋
            </span>
          </div>

          <h1 className="text-balance text-[28px] font-semibold tracking-tight sm:text-[32px]">
            Let’s build your next great stay.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
            Curate rentals, track verifications, and collaborate with your team from one welcoming
            place. We’ll surface what needs your attention so you can focus on guest‑ready
            experiences.
          </p>

          {/* Stats */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60"
                style={{ borderRadius: "var(--brand-radius)" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
                <div className="leading-tight">
                  <div className="text-[22px] font-semibold">{stat.value}</div>
                  <div className="text-[12px] text-neutral-500 dark:text-neutral-400">{stat.label}</div>
                  <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{stat.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:grid-cols-12">
        {/* Quick Actions */}
        <section className="sm:col-span-7">
          <Card>
            <CardHeader eyebrow="Your next steps" title="Quick actions" cta={{ href: "/properties", label: "Jump back in" }} />
            <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
              {QUICK_LINKS.map((link) => (
                <article key={link.title} className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
                      <link.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium">{link.title}</h3>
                      <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-300">{link.description}</p>
                    </div>
                  </div>
                  <Link className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900" href={link.href}>
                    {link.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </Card>

          {/* Updates */}
          <Card className="mt-6">
            <CardHeader eyebrow="Team updates" title="What’s new at ArbiBase" />
            <ul className="mt-2 space-y-5">
              {UPDATES.map((update) => (
                <li key={update.title} className="relative pl-6">
                  <span className="absolute left-0 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: "var(--brand-primary)" }}>
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{update.date}</p>
                  <h3 className="mt-0.5 text-[14px] font-semibold">{update.title}</h3>
                  <p className="text-[13px] text-neutral-600 dark:text-neutral-300">{update.body}</p>
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
                <article key={p.name} className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/60" style={{ borderRadius: "var(--brand-radius)" }}>
                  <div className="relative h-40 w-full overflow-hidden">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                        <span className="text-sm">No photo</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-900 shadow-sm backdrop-blur dark:bg-neutral-900/80 dark:text-neutral-100">
                      <Sparkles className="h-3 w-3" /> {p.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[15px] font-semibold tracking-tight">{p.name}</h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-neutral-500 dark:text-neutral-400">
                      <MapPin className="h-3.5 w-3.5" /> {p.location}
                    </p>
                    <p className="mt-2 text-[13px] text-neutral-600 dark:text-neutral-300">{p.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </Card>

          {/* Support */}
          <Card className="mt-6">
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--brand-primary) 7%, white), color-mix(in oklab, var(--brand-accent) 8%, white))" }}>
              <p className="text-[11px] uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Need a hand?</p>
              <h2 className="mt-1 text-[16px] font-semibold">Your concierge team is on standby</h2>
              <p className="mt-1 text-[13px] text-neutral-700 dark:text-neutral-300">Message us for tailored onboarding help, market insights, or to schedule a strategy session. We reply within a business day—usually sooner.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href="mailto:support@arbibase.com" style={{ backgroundColor: "var(--brand-primary)" }}>
                  <Mail className="h-4 w-4" /> Email support
                </Link>
                <Link className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[13px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href="/request-verification" style={{ borderColor: "color-mix(in oklab, var(--brand-primary) 35%, #e5e5e5)", background: "white", color: "color-mix(in oklab, var(--brand-primary) 70%, #111)" }}>
                  Book a call <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </div>
      {/* NOTE: footer intentionally removed to avoid duplication with site footer */}
    </main>
  );
}

/* ----------------------- */
/* Helpers & UI primitives */
/* ----------------------- */
const QUICK_LINKS = [
  { title: "Explore verified doors", description: "Review high-confidence homes and suites that are ready to onboard.", href: "/properties", cta: "Browse properties", icon: Compass },
  { title: "Request a property check", description: "Submit an address and we’ll confirm licensing, HOAs, and local rules for you.", href: "/request-verification", cta: "Start a request", icon: CheckCircle2 },
  { title: "Keep tabs on favourites", description: "See every opportunity you’ve starred and how each one is progressing.", href: "/favorites", cta: "Open favourites", icon: Star },
];

const UPDATES = [
  { title: "Local compliance team added 4 new city partnerships", date: "Today", body: "Priority reviews in Denver, San Diego, Miami, and Nashville now complete." },
  { title: "Coach marketplace applications reopen next week", date: "Yesterday", body: "We’ll send you an email when the cohort is live so you can reserve a slot early." },
  { title: "Product tip: Collaborate from the pipeline view", date: "This week", body: "Share shortlists with partners and track comments alongside your saved homes." },
];

function recentlyVerified(verified_at?: string) {
  if (!verified_at) return false;
  const t = Date.parse(verified_at);
  return Number.isFinite(t) && Date.now() - t < 1000 * 60 * 60 * 24 * 14;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"rounded-3xl border border-neutral-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60 " + className} style={{ borderRadius: "var(--brand-radius)" }}>
      {children}
    </div>
  );
}

function CardHeader({ eyebrow, title, cta }: { eyebrow?: string; title: string; cta?: { href: string; label: string } }) {
  return (
    <header className="mb-1.5 flex items-center justify-between">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{eyebrow}</p>}
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      </div>
      {cta && (
        <Link href={cta.href} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[13px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "color-mix(in oklab, var(--brand-primary) 35%, #e5e5e5)", background: "white", color: "color-mix(in oklab, var(--brand-primary) 70%, #111)" }}>
          {cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </header>
  );
}

function Skeleton() {
  return (
    <main className="relative min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <BackgroundTexture />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <section className="rounded-3xl border border-neutral-200/70 bg-white/70 p-8 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="mb-4 h-5 w-32 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-2 h-8 w-1/2 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-6 h-4 w-2/3 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandStyle() {
  return (
    <style jsx global>{`
      :root {
        --brand-primary: ${BRAND.primary};
        --brand-primary-soft: ${BRAND.primarySoft};
        --brand-accent: ${BRAND.accent};
        --brand-radius: ${BRAND.radius};
      }
    `}</style>
  );
}

function BackgroundTexture() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]" />
      <div className="absolute left-1/2 top-[-120px] h-[220px] w-[380px] -translate-x-1/2 rounded-full bg-gradient-radial from-[color:var(--brand-primary)]/20 via-transparent to-transparent blur-2xl" />
      <div className="absolute right-[10%] top-[34%] h-[160px] w-[160px] rounded-full bg-gradient-radial from-[color:var(--brand-accent)]/25 via-transparent to-transparent blur-2xl" />
      <div className="absolute left-[6%] bottom-[12%] h-[180px] w-[180px] rounded-full bg-gradient-radial from-[color:var(--brand-primary-soft)]/22 via-transparent to-transparent blur-2xl" />
    </div>
  );
}
