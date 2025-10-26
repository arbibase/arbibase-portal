"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Compass, CheckCircle2, Star,
  Building2, ClipboardList, CircleCheckBig,
  Mail, ArrowRight, Sparkles
} from "lucide-react";

/** Visual tokens (parity with portal) */
const BRAND = {
  primary: "#00e1ff",
  accent:  "#3b82f6",
};

type Spotlight = {
  name: string;
  location: string;
  status: string;
  summary: string;
  photo?: string;
};

/** Helper: recent verify badge */
function recentlyVerified(verified_at?: string) {
  if (!verified_at) return false;
  const t = Date.parse(verified_at);
  return Number.isFinite(t) && Date.now() - t < 1000 * 60 * 60 * 24 * 14;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** ---- KPI cards ---- */
  const [kpis, setKpis] = useState([
    { label: "Requested Properties", value: "–", detail: "Open / In review", icon: ClipboardList },
    { label: "Verified Doors",      value: "–", detail: "Operator ready",   icon: Building2 },
    { label: "Pending Approvals",   value: "–", detail: "Awaiting review",  icon: CircleCheckBig },
  ]);

  /** ---- Spotlight ---- */
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);

  const router = useRouter();

  /** Auth */
  useEffect(() => {
    (async () => {
      if (!supabase) return router.replace("/login");
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.replace("/login");
      setUser(data.user);
      setLoading(false);
    })();
  }, [router]);

  /** KPIs + Spotlight fetch */
  useEffect(() => {
    if (!user || !supabase) return;

    (async () => {
      const client = supabase;

      // --- KPI: Requested Properties (requests table names can vary; using broad guesses + safe fallbacks) ---
      // Try common tables: property_requests, requests
      let requested = 0;
      try {
        const { count } =
          (await client.from("property_requests")
            .select("id", { count: "exact", head: true })
            .in("status", ["submitted", "in_review", "open"])) as any;
        requested = count ?? 0;
      } catch { /* ignore */ }

      if (!requested) {
        try {
          const { count } =
            (await client.from("requests")
              .select("id", { count: "exact", head: true })
              .in("status", ["submitted", "in_review", "open"])) as any;
          requested = count ?? 0;
        } catch { /* ignore */ }
      }

      // --- KPI: Verified Doors ---
      let verified = 0;
      try {
        const { count } =
          (await client.from("properties")
            .select("id", { count: "exact", head: true })
            .eq("verified", true)) as any;
        verified = count ?? 0;
      } catch { /* ignore */ }

      // --- KPI: Pending Approvals (generic “approvals” queue or requests awaiting approval) ---
      let pending = 0;
      try {
        const { count } =
          (await client.from("approvals")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "awaiting"])) as any;
        pending = count ?? 0;
      } catch { /* ignore */ }

      if (!pending) {
        try {
          const { count } =
            (await client.from("property_requests")
              .select("id", { count: "exact", head: true })
              .in("status", ["awaiting_approval", "pending"])) as any;
          pending = count ?? 0;
        } catch { /* ignore */ }
      }

      setKpis([
        { label: "Requested Properties", value: String(requested), detail: "Open / In review", icon: ClipboardList },
        { label: "Verified Doors",       value: String(verified),  detail: "Operator ready",   icon: Building2 },
        { label: "Pending Approvals",    value: String(pending),   detail: "Awaiting review",  icon: CircleCheckBig },
      ]);

      // --- Spotlight: “most interacted” if available; otherwise featured/recent; otherwise mocks ---
      // Strategy: try to order by interaction_score = coalesce(view_count,0) + 3*coalesce(favorite_count,0)
      // If those columns don’t exist, fall back gracefully.
      let spotlightRows: any[] | null = null;

      try {
        const { data } = await client
          .from("properties")
          .select(`
            name, city, state,
            summary:headline,
            verified, verified_at,
            featured, photo_url,
            view_count, favorite_count
          `)
          .limit(6);

        spotlightRows = data || null;
      } catch { /* ignore */ }

      if (spotlightRows) {
        // Compute interaction score client-side (safe even if columns are missing)
        const enriched = spotlightRows.map((p: any) => ({
          ...p,
          _score: (Number(p.view_count || 0) * 1) + (Number(p.favorite_count || 0) * 3),
        }));

        // Prefer interacted > featured > verified recency
        enriched.sort((a: any, b: any) => {
          const sa = a._score ?? 0;
          const sb = b._score ?? 0;
          if (sb !== sa) return sb - sa;
          if (b.featured && !a.featured) return 1;
          if (a.featured && !b.featured) return -1;
          const ta = a.verified_at ? Date.parse(a.verified_at) : 0;
          const tb = b.verified_at ? Date.parse(b.verified_at) : 0;
          return (tb || 0) - (ta || 0);
        });

        const mapped: Spotlight[] = enriched.slice(0, 6).map((p: any) => ({
          name: p.name || "Untitled listing",
          location: [p.city, p.state].filter(Boolean).join(" • "),
          status: p.verified
            ? (recentlyVerified(p.verified_at) ? "Newly verified" : "Verified")
            : (p._score > 0 ? "Trending" : "Lead refreshed"),
          summary: p.summary || "Operator-friendly terms and flexible options.",
          photo: p.photo_url || undefined,
        }));

        if (mapped.length) {
          setSpotlights(mapped);
          return;
        }
      }

      // Mock fallback (if DB empty)
      setSpotlights([
        {
          name: "The Willow Lofts",
          location: "Capitol Hill • Seattle",
          status: "Newly verified",
          summary: "7 furnished units with flexible 6–12 month terms and concierge support.",
          photo: "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1200&auto=format&fit=crop",
        },
        {
          name: "Riverfront Rowhomes",
          location: "Downtown • Austin",
          status: "Trending",
          summary: "Boutique rowhomes ideal for owner-operators expanding into STR + mid-term.",
          photo: "https://images.unsplash.com/photo-1459535653751-d571815e906b?q=80&w=1200&auto=format&fit=crop",
        },
      ]);
    })();
  }, [user]);

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  if (loading) return <div className="p-10 text-center fine">Loading…</div>;

return (
  <main className="mx-auto max-w-[1140px] px-6 pb-14" style={{ display: "grid", gap: 18 }}>
    {/* ===== Glass Hero ===== */}
    <section
      className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,.65)]"
      style={{ padding: 20 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Verified Access
          </div>
          <h1 className="mt-1 mb-1 text-2xl font-extrabold">Hey {firstName} 👋</h1>
          <p className="text-sm text-white/70">
            Manage properties, track verifications, and view your latest opportunities.
          </p>
        </div>

        {/* Gradient CTAs */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#041018]"
            style={{
              background: "linear-gradient(135deg,#00e1ff,#3b82f6)",
              boxShadow: "0 0 24px rgba(0,225,255,.25)",
            }}
          >
            Browse Properties
          </Link>
          <Link
            href="/request-verification"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            New Request
          </Link>
        </div>
      </div>
    </section>

      {/* ===== KPIs ===== */}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        {kpis.map((s) => (
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
              background: "linear-gradient(180deg,#0e141c,#0b121a)",
            }}
          >
            <div
              style={{
                background: "rgba(0,225,255,.10)",
                border: "1px solid rgba(0,225,255,.18)",
                borderRadius: 12,
                padding: 8,
                display: "grid",
                placeItems: "center",
              }}
            >
              <s.icon size={20} />
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
              <div className="fine">{s.label}</div>
              <div className="fine" style={{ color: "var(--muted)" }}>{s.detail}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ===== Quick Actions ===== */}
      <section>
        <h2 style={{ marginBottom: 10 }}>Quick Actions</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {QUICK_LINKS.map((q) => (
            <div key={q.title} className="surface" style={{ padding: 18, display: "grid", gap: 8, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <q.icon size={18} />
                <h3 style={{ margin: 0 }}>{q.title}</h3>
              </div>
              <p className="fine" style={{ color: "var(--muted)" }}>{q.description}</p>
              <Link href={q.href} className="btn" style={{ justifySelf: "start" }}>
                {q.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Spotlight Listings (most-interacted) ===== */}
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
                background: "rgba(14,20,28,.86)",
              }}
            >
              {p.photo && <img src={p.photo} alt={p.name} style={{ width: "100%", height: 180, objectFit: "cover" }} />}
              <div style={{ padding: 14 }}>
                <span className="badge">{p.status}</span>
                <h3 style={{ margin: "6px 0 2px" }}>{p.name}</h3>
                <p className="fine">{p.location}</p>
                <p className="fine" style={{ color: "var(--muted)" }}>{p.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Concierge ===== */}
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
        <p className="fine" style={{ color: "var(--muted)", marginBottom: 4 }}>Need a hand?</p>
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
          <Link href="/" className="btn" style={{ borderColor: "var(--line)" }}>
            Book a Call <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ---- Quick links ---- */
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
