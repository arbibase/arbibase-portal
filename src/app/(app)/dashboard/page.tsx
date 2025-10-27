"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Compass, CheckCircle2, Star, Building2, ClipboardList, CircleCheckBig,
  Mail, ArrowRight, Sparkles, TrendingUp, DollarSign, Calendar,
  AlertCircle, Users, Target, Zap, BarChart3, Activity
} from "lucide-react";
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
  const [operatorStats, setOperatorStats] = useState({
    verifiedDoors: 0,
    activeLeads: 0,
    requestsUsed: 0,
    requestsLimit: 50, // Based on tier
    recentlyVerified: 0, // Last 7 days
    tasksOverdue: 0
  });
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (!supabase) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login?redirect=/dashboard");
        return;
      }
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

      // Replace fake portfolio metrics with real operator KPIs
      setOperatorStats({
        verifiedDoors: 0, // Will populate from DB
        activeLeads: 0,
        requestsUsed: 0,
        requestsLimit: 50, // Based on subscription tier
        recentlyVerified: 0,
        tasksOverdue: 0
      });
    })();
  }, [user]);

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  if (loading) return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-white/70">Loading your dashboard...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      {/* Enhanced Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <span>/</span>
            <span className="text-white/90">Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-white/60">Your verified arbitrage command center</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/requests"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <ClipboardList size={16} /> View Requests
          </Link>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,.3)] hover:bg-emerald-600"
          >
            <Sparkles size={16} /> Browse Properties
          </Link>
        </div>
      </header>

      {/* Operator-Focused Stats - Reality-Based */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OperatorMetricCard
          icon={<Building2 size={20} />}
          label="Verified Doors"
          value={operatorStats.verifiedDoors}
          sublabel="Ready to onboard"
          color="emerald"
          href="/properties?filter=verified"
        />
        <OperatorMetricCard
          icon={<TrendingUp size={20} />}
          label="Active Leads"
          value={operatorStats.activeLeads}
          sublabel="In your pipeline"
          color="blue"
          href="/requests?status=active"
        />
        <OperatorMetricCard
          icon={<Target size={20} />}
          label="Requests Used"
          value={`${operatorStats.requestsUsed}/${operatorStats.requestsLimit}`}
          sublabel="This month"
          color="violet"
          href="/requests"
        />
        <OperatorMetricCard
          icon={<Sparkles size={20} />}
          label="New This Week"
          value={operatorStats.recentlyVerified}
          sublabel="Verified properties"
          color="cyan"
          href="/properties?filter=new"
        />
      </section>

      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pipeline Status */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Your Pipeline</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <kpi.icon size={18} className="text-emerald-400" />
                    <span className="text-2xl font-bold text-white">{kpi.value}</span>
                  </div>
                  <p className="text-xs font-medium text-white/90">{kpi.label}</p>
                  <p className="text-[11px] text-white/50">{kpi.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Empty State / Onboarding */}
          {operatorStats.verifiedDoors === 0 && (
            <section className="rounded-2xl border border-emerald-400/20 bg-linear-to-br from-emerald-500/10 to-sky-500/10 p-8 text-center">
              <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Sparkles size={28} className="text-emerald-400" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Ready to find your first verified door?</h3>
              <p className="mb-6 text-sm text-white/60">
                Browse our curated inventory of landlord-approved properties—no cold calls, no surprises.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/properties"
                  className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Browse Verified Properties
                </Link>
                <Link
                  href="/requests"
                  className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                >
                  Request Verification
                </Link>
              </div>
            </section>
          )}

          {/* Trending Opportunities */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Trending Opportunities</h2>
              <Link href="/properties" className="text-sm text-emerald-400 hover:text-emerald-300">
                View all →
              </Link>
            </div>
            <SpotlightCarousel items={spotlights} />
          </section>

          {/* Recent Activity */}
          <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 bg-white/5 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Recent Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/70">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {operatorStats.verifiedDoors === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-white/50">
                        No activity yet. Start by browsing properties or submitting a request.
                      </td>
                    </tr>
                  ) : (
                    <>
                      <ActivityRow
                        property="123 Oak St, Austin"
                        type="Request"
                        status="In Review"
                        statusColor="amber"
                        updated="2 hours ago"
                        href="/requests"
                      />
                      <ActivityRow
                        property="Riverfront Rowhomes"
                        type="Property"
                        status="Verified"
                        statusColor="emerald"
                        updated="Yesterday"
                        href="/properties"
                      />
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Quick Actions */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-base font-bold text-white">Quick Actions</h3>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm transition-all hover:bg-white/10 hover:border-emerald-400/30"
                >
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <action.icon size={16} />
                  </div>
                  <span className="font-medium text-white/90">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Beta Platform Info */}
          <section className="rounded-2xl border border-sky-400/20 bg-linear-to-br from-sky-500/10 to-violet-500/10 p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-sky-500/20 px-2 py-1 text-xs font-semibold text-sky-300">
                BETA
              </div>
            </div>
            <h3 className="mb-2 text-base font-bold text-white">You're an Early Adopter</h3>
            <p className="mb-4 text-xs text-white/60">
              Help us build the future of verified STR/MTR arbitrage. Your feedback shapes the platform.
            </p>
            <Link
              href="mailto:feedback@arbibase.com"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/20"
            >
              <Mail size={14} /> Share Feedback
            </Link>
          </section>

          {/* Support CTA */}
          <section className="rounded-2xl border border-emerald-400/20 bg-linear-to-br from-emerald-500/10 to-sky-500/10 p-6 text-center">
            <div className="mb-3 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Mail size={20} className="text-emerald-400" />
            </div>
            <h3 className="mb-2 text-base font-bold text-white">Need Assistance?</h3>
            <p className="mb-4 text-xs text-white/60">
              Our concierge team is on standby for verified property sourcing & market insights
            </p>
            <Link
              href="mailto:support@arbibase.com"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Mail size={14} /> Contact Support
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

// Updated Component for Operator Metrics

function OperatorMetricCard({ icon, label, value, sublabel, color, href }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel: string;
  color: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/30",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/30",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/30"
  };

  const content = (
    <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4 transition-all hover:scale-[1.02]`}>
      <div className="mb-3 rounded-lg bg-white/10 p-2 text-white/90 w-fit">{icon}</div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs font-medium text-white/70">{label}</p>
      <p className="text-[11px] text-white/50">{sublabel}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ActivityRow({ property, type, status, statusColor, updated, href }: {
  property: string;
  type: string;
  status: string;
  statusColor: string;
  updated: string;
  href: string;
}) {
  const statusColorMap: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/20 text-amber-300",
    blue: "bg-blue-500/20 text-blue-300",
  };

  return (
    <tr className="hover:bg-white/5">
      <td className="px-6 py-4 text-white/90">{property}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColorMap[statusColor]}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-white/70">{updated}</td>
      <td className="px-6 py-4 text-right">
        <Link href={href} className="text-emerald-400 hover:text-emerald-300">
          View →
        </Link>
      </td>
    </tr>
  );
}

const QUICK_ACTIONS = [
  { icon: Compass, label: "Browse Properties", href: "/properties" },
  { icon: ClipboardList, label: "Submit Request", href: "/requests" },
  { icon: Star, label: "View Favorites", href: "/favorites" },
  { icon: Target, label: "My Pipeline", href: "/requests?view=pipeline" },
];
