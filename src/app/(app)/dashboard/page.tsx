"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Inbox, Building2, CalendarClock, Star, CheckCircle2, Compass, Sparkles, Mail, ArrowRight } from "lucide-react";

/**
 * ArbiBase Operator Dashboard (Dark Revamp v1.0)
 * Keeps your Supabase metrics + spotlight logic
 * Rebuilt in new dark design system (portal theme parity)
 */

const BRAND = {
  primary: "#00e1ff",
  accent: "#3b82f6",
};

type Spotlight = {
  name: string;
  location: string;
  status: string;
  summary: string;
  photo?: string;
};

function recentlyVerified(verified_at?: string) {
  if (!verified_at) return false;
  const t = Date.parse(verified_at);
  return Number.isFinite(t) && Date.now() - t < 1000 * 60 * 60 * 24 * 14;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState([
    { label: "Active leads", value: "–", detail: "Loading…", icon: Inbox },
    { label: "Verified doors", value: "–", detail: "Loading…", icon: Building2 },
    { label: "Tasks due", value: "–", detail: "Loading…", icon: CalendarClock },
  ]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /** Auth check */
  useEffect(() => {
    (async () => {
      // Guard against a possibly null/undefined supabase client
      if (!supabase) {
        // Fallback: redirect to login if supabase client isn't available
        router.replace("/login");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    })();
  }, [router]);

  /** Fetch dashboard metrics */
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (!supabase) return;
      const client = supabase;
      const { count: leads } = await client
        .from("leads")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "working", "new"]);
      const { count: verified } = await client
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("verified", true);
      const { count: due } = await client
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      setStats([
        { label: "Active leads", value: String(leads ?? 0), detail: "+ this month", icon: Inbox },
        { label: "Verified doors", value: String(verified ?? 0), detail: "Operator ready", icon: Building2 },
        { label: "Tasks due", value: String(due ?? 0), detail: "Due today / overdue", icon: CalendarClock },
      ]);

      const { data: spotlightData } = await client
        .from("properties")
        .select("name, city, state, summary:headline, featured, verified, verified_at, photo_url")
        .eq("featured", true)
        .limit(6);

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
    })();
  }, [user]);

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  if (loading) return <div className="p-10 text-center fine">Loading...</div>;

  return (
    <main className="container" style={{ display: "grid", gap: 18 }}>
      {/* Header */}
      <section
        className="surface"
        style={{
          padding: 20,
          borderRadius: "var(--rad-lg)",
          background:
            "linear-gradient(180deg,#0b1017 0%,#0c131e 100%)",
          boxShadow: "0 0 40px rgba(0,225,255,.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <span className="pill">Hey {firstName} 👋</span>
            <h1 style={{ margin: "6px 0 4px" }}>Your Operator Dashboard</h1>
            <p className="fine" style={{ color: "var(--muted)" }}>
              Manage properties, track verifications, and view your latest opportunities.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn primary" href="/properties">
              Browse Properties →
            </Link>
            <Link className="btn" href="/requests">
              New Request
            </Link>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            className="surface"
            style={{
              padding: 16,
              borderRadius: "var(--rad-lg)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                background: "rgba(0,225,255,.08)",
                borderRadius: 12,
                padding: 8,
                display: "grid",
                placeItems: "center",
              }}
            >
              <s.icon size={20} />
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div className="fine">{s.label}</div>
              <div className="fine" style={{ color: "var(--muted)" }}>
                {s.detail}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Quick actions */}
      <section>
        <h2 style={{ marginBottom: 10 }}>Quick Actions</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {QUICK_LINKS.map((q) => (
            <div key={q.title} className="surface" style={{ padding: 18, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <q.icon size={18} />
                <h3 style={{ margin: 0 }}>{q.title}</h3>
              </div>
              <p className="fine" style={{ color: "var(--muted)" }}>
                {q.description}
              </p>
              <Link href={q.href} className="btn" style={{ justifySelf: "start" }}>
                {q.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlights */}
      <section>
        <h2 style={{ marginBottom: 10 }}>Spotlight Listings</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
          {spotlights.map((p) => (
            <article
              key={p.name + p.location}
              className="surface"
              style={{
                borderRadius: "var(--rad-lg)",
                overflow: "hidden",
                border: "1px solid var(--line)",
                background: "rgba(14,20,28,.8)",
              }}
            >
              {p.photo && <img src={p.photo} alt={p.name} style={{ width: "100%", height: 180, objectFit: "cover" }} />}
              <div style={{ padding: 14 }}>
                <span className="badge">{p.status}</span>
                <h3 style={{ margin: "4px 0" }}>{p.name}</h3>
                <p className="fine">{p.location}</p>
                <p className="fine" style={{ color: "var(--muted)" }}>
                  {p.summary}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Concierge */}
      <section
        className="surface"
        style={{
          padding: 24,
          borderRadius: "var(--rad-lg)",
          background: "linear-gradient(180deg,#0f141c,#0b1017)",
          textAlign: "center",
          border: "1px solid var(--line)",
        }}
      >
        <p className="fine" style={{ color: "var(--muted)", marginBottom: 4 }}>
          Need a hand?
        </p>
        <h2 style={{ margin: "0 0 10px" }}>Your Concierge Team is on Standby</h2>
        <p className="fine" style={{ color: "var(--muted)", marginBottom: 14 }}>
          Message us for tailored onboarding help, market insights, or to schedule a strategy session.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="mailto:support@arbibase.com"
            className="btn primary"
            style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.accent})`, color: "#041018" }}
          >
            <Mail size={16} /> Email Support
          </Link>
          <Link href="/request-verification" className="btn" style={{ borderColor: "var(--line)" }}>
            Book a Call <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ---- Data ---- */
const QUICK_LINKS = [
  {
    title: "Explore verified doors",
    description: "Review high-confidence homes and suites that are ready to onboard.",
    href: "/properties",
    cta: "Browse properties",
    icon: Compass,
  },
  {
    title: "Request a property check",
    description: "Submit an address and we’ll confirm availability and local rules for you.",
    href: "/requests",
    cta: "Start a request",
    icon: CheckCircle2,
  },
  {
    title: "Keep tabs on favourites",
    description: "See every opportunity you’ve starred at once.",
    href: "/favorites",
    cta: "Open favourites",
    icon: Star,
  },
];
