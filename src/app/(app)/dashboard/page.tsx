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

import AppShell from "@/components/AppShell";
import SpotlightCarousel, { SpotlightCard } from "@/components/SpotlightCarousel";

/** Visual tokens */
const BRAND = { primary: "#00e1ff", accent: "#3b82f6" };

type Spotlight = SpotlightCard;

function recentlyVerified(verified_at?: string) {
  if (!verified_at) return false;
  const t = Date.parse(verified_at);
  return Number.isFinite(t) && Date.now() - t < 1000 * 60 * 60 * 24 * 14;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState([
    { label: "Requested Properties", value: "–", detail: "Open / In review", icon: ClipboardList },
    { label: "Verified Doors",      value: "–", detail: "Operator ready",   icon: Building2 },
    { label: "Pending Approvals",   value: "–", detail: "Awaiting review",  icon: CircleCheckBig },
  ]);

  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (!supabase) return router.replace("/login");
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return router.replace("/login");
      setUser(data.user);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!user || !supabase) return;
    (async () => {
      const client = supabase;

      // --- KPI: Requested
      let requested = 0;
      try {
        const { count } = await client.from("property_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["submitted","in_review","open"]);
        requested = count ?? 0;
      } catch {}
      if (!requested) {
        try {
          const { count } = await client.from("requests")
            .select("id", { count: "exact", head: true })
            .in("status", ["submitted","in_review","open"]);
          requested = count ?? 0;
        } catch {}
      }

      // --- KPI: Verified
      let verified = 0;
      try {
        const { count } = await client.from("properties")
          .select("id", { count: "exact", head: true })
          .eq("verified", true);
        verified = count ?? 0;
      } catch {}

      // --- KPI: Pending approvals
      let pending = 0;
      try {
        const { count } = await client.from("approvals")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending","awaiting"]);
        pending = count ?? 0;
      } catch {}
      if (!pending) {
        try {
          const { count } = await client.from("property_requests")
            .select("id", { count: "exact", head: true })
            .in("status", ["awaiting_approval","pending"]);
          pending = count ?? 0;
        } catch {}
      }

      setKpis([
        { label: "Requested Properties", value: String(requested), detail: "Open / In review", icon: ClipboardList },
        { label: "Verified Doors",       value: String(verified),  detail: "Operator ready",   icon: Building2 },
        { label: "Pending Approvals",    value: String(pending),   detail: "Awaiting review",  icon: CircleCheckBig },
      ]);

      // --- Spotlight: score client-side
      let rows: any[] | null = null;
      try {
        const { data } = await client.from("properties").select(`
          name, city, state,
          summary:headline,
          verified, verified_at,
          featured, photo_url,
          view_count, favorite_count
        `).limit(12);
        rows = data || null;
      } catch {}

      if (rows?.length) {
        const enriched = rows.map(p => ({
          ...p,
          _score: Number(p.view_count || 0) + 3 * Number(p.favorite_count || 0),
        }));
        enriched.sort((a,b) => {
          const sa=a._score||0, sb=b._score||0;
          if (sb!==sa) return sb-sa;
          if (b.featured && !a.featured) return 1;
          if (a.featured && !b.featured) return -1;
          const ta=a.verified_at?Date.parse(a.verified_at):0;
          const tb=b.verified_at?Date.parse(b.verified_at):0;
          return (tb||0)-(ta||0);
        });

        const mapped: Spotlight[] = enriched.slice(0,8).map((p:any)=>({
          name: p.name || "Untitled listing",
          location: [p.city, p.state].filter(Boolean).join(" • "),
          status: p.verified ? (recentlyVerified(p.verified_at)?"Newly verified":"Verified") : (p._score>0?"Trending":"Lead refreshed"),
          summary: p.summary || "Operator-friendly terms and flexible options.",
          photo: p.photo_url || undefined,
        }));
        setSpotlights(mapped);
      } else {
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
      }
    })();
  }, [user]);

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  if (loading) return <AppShell active="overview"><div className="p-10 text-center">Loading…</div></AppShell>;

  return (
    <AppShell active="overview">
      {/* Glass Hero */}
      <section className="rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,.65)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Verified Access
            </div>
            <h1 className="mt-1 mb-1 text-2xl font-extrabold">Hey {firstName} 👋</h1>
            <p className="text-sm text-white/70">Manage properties, track verifications, and view your latest opportunities.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#041018]"
              style={{ background: "linear-gradient(135deg,#00e1ff,#3b82f6)", boxShadow: "0 0 24px rgba(0,225,255,.25)" }}
            >
              Browse Properties
            </Link>
            <Link
              href="/request-verification"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              <Sparkles size={16}/> New Request
            </Link>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/15 bg-white/8 p-2">
                <s.icon size={18}/>
              </div>
              <div>
                <div className="text-xl font-extrabold">{s.value}</div>
                <div className="text-sm text-white/80">{s.label}</div>
                <div className="text-xs text-white/50">{s.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Quick actions */}
      <section className="mt-7">
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_LINKS.map((q) => (
            <div key={q.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <q.icon size={16} />
                <h3 className="text-base font-semibold">{q.title}</h3>
              </div>
              <p className="text-sm text-white/70">{q.description}</p>
              <Link href={q.href} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
                {q.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlight carousel */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Spotlight Listings</h2>
        <SpotlightCarousel items={spotlights} />
      </section>

      {/* Recent activity (mock) */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Item</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Updated</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {/* swap with your live activity rows later */}
              <tr>
                <td className="px-4 py-2">Request • 123 Oak St, Austin</td>
                <td className="px-4 py-2 text-emerald-300">In review</td>
                <td className="px-4 py-2 text-white/60">Today, 9:32am</td>
                <td className="px-4 py-2 text-right">
                  <Link href="/requests" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10">Open</Link>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">Property • Riverfront Rowhomes</td>
                <td className="px-4 py-2 text-emerald-300">Verified</td>
                <td className="px-4 py-2 text-white/60">Yesterday</td>
                <td className="px-4 py-2 text-right">
                  <Link href="/properties" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10">View</Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Concierge */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-linear-to-b from-[#0f141c] to-[#0b1017] p-6 text-center">
        <p className="mb-1 text-sm text-white/60">Need a hand?</p>
        <h3 className="mb-2 text-xl font-semibold">Your Concierge Team is on Standby</h3>
        <p className="mx-auto mb-4 max-w-2xl text-sm text-white/60">
          Message us for tailored onboarding help, market insights, or to schedule a strategy session.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="mailto:support@arbibase.com"
            className="btn"
            style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.accent})`, color: "#041018" }}
          >
            <Mail size={16} /> Email Support
          </Link>
          <Link href="/" className="btn border border-white/15 bg-white/5 hover:bg-white/10">
            Book a Call <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

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
