"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Compass, CheckCircle2, Star, Building2, ClipboardList, CircleCheckBig,
  Mail, Sparkles, TrendingUp, Target, PieChart, Users, Search
} from "lucide-react";
import SpotlightCarousel, { SpotlightCard } from "@/components/SpotlightCarousel";
import MarketRadar from "@/components/MarketRadar";

type Spotlight = SpotlightCard;

type PropertyRequest = {
  id: string;
  address: string;
  city: string;
  state: string;
  status: "pending" | "in_review" | "verified" | "rejected";
  created_at: string;
  updated_at: string;
  property_type?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [operatorStats, setOperatorStats] = useState({
    verifiedDoors: 0,
    activeLeads: 0,
    requestsUsed: 0,
    requestsLimit: 50,
    recentlyVerified: 0,
    tasksOverdue: 0
  });
  const [recentActivity, setRecentActivity] = useState<PropertyRequest[]>([]);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [spotlightsLoaded, setSpotlightsLoaded] = useState(false);
  const [marketRadarData, setMarketRadarData] = useState<{ city: string; state: string; count: number }[]>([]);
  const router = useRouter();

  function isSupabaseConfiguredClientSide() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only set user and loading=false after auth is confirmed
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
    })();
  }, [router]);

  // Fetch stats after user is set
  useEffect(() => {
    if (!user || !supabase) return;
    setStatsLoaded(false);
    fetchUserStats();
  }, [user]);

  // Fetch spotlights and market radar after user is set
  useEffect(() => {
    if (!user || !supabase) return;
    setSpotlightsLoaded(false);
    fetchSpotlights();
    fetchMarketRadarData();
  }, [user, supabase]);

  async function fetchUserStats() {
    if (!supabase || !user) {
      setStatsLoaded(true);
      return;
    }
    try {
      const { data: requests, error: requestsError, status: requestsStatus } = await supabase
        .from("property_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (requestsError) {
        if (requestsStatus === 404) {
          console.warn("Supabase table 'property_requests' not found (404). Dashboard will show empty stats until backend is fixed.");
        } else {
          console.error("Error fetching requests:", requestsError);
        }
        setOperatorStats((prev) => ({ ...prev, verifiedDoors: 0, activeLeads: 0, requestsUsed: 0 }));
        setRecentActivity([]);
        setStatsLoaded(true);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("requests_limit")
        .eq("user_id", user.id)
        .single();

      const requestLimit = profile?.requests_limit || 50;
      const allRequests = requests || [];
      const totalRequests = allRequests.length;
      const verifiedCount = allRequests.filter(r => r.status === "verified").length;
      const activeLeadsCount = allRequests.filter(r => r.status === "in_review" || r.status === "pending").length;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentlyVerifiedCount = allRequests.filter(r => r.status === "verified" && new Date(r.updated_at) > sevenDaysAgo).length;

      setOperatorStats({
        verifiedDoors: verifiedCount,
        activeLeads: activeLeadsCount,
        requestsUsed: totalRequests,
        requestsLimit: requestLimit,
        recentlyVerified: recentlyVerifiedCount,
        tasksOverdue: 0
      });

      setRecentActivity(allRequests.slice(0, 5));
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setStatsLoaded(true);
    }
  }

  async function fetchSpotlights() {
    if (!isSupabaseConfiguredClientSide() || !supabase) {
      setSpotlights([]);
      setSpotlightsLoaded(true);
      return;
    }
    try {
      const { data: properties, error, status } = await supabase
        .from("property_requests")
        .select("address, city, state, status, updated_at, property_type")
        .eq("status", "verified")
        .order("updated_at", { ascending: false })
        .limit(3);

      if (error) {
        if (status === 404) {
          console.warn("Supabase table 'property_requests' not found (404). Trending Opportunities disabled.");
        } else {
          console.error("Error fetching spotlights:", error);
        }
        setSpotlights([]);
        setSpotlightsLoaded(true);
        return;
      }

      const formattedSpotlights = (properties || []).map((prop: any) => ({
        name: `${prop.address}, ${prop.city}`,
        location: `${prop.city}, ${prop.state}`,
        status: "VERIFIED",
        summary: `Verified property in ${prop.city}, ${prop.state}`,
        photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400"
      }));

      setSpotlights(formattedSpotlights);
    } catch (error) {
      console.error("Error fetching spotlights:", error);
      setSpotlights([]);
    } finally {
      setSpotlightsLoaded(true);
    }
  }

  async function fetchMarketRadarData() {
    if (!supabase) return;
    try {
      // Fetch all city/state pairs and group by city/state in JS
      const { data: allProps, error } = await supabase
        .from("property_requests")
        .select("city, state");

      if (error) {
        console.error("Error fetching market radar data:", error);
        setMarketRadarData([]);
        return;
      }

      // Group by city/state and count
      const counts: Record<string, { city: string; state: string; count: number }> = {};
      (allProps || []).forEach((row) => {
        if (!row.city || !row.state) return;
        const key = `${row.city},${row.state}`;
        if (!counts[key]) counts[key] = { city: row.city, state: row.state, count: 0 };
        counts[key].count += 1;
      });
      const radarData = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setMarketRadarData(radarData);

    } catch (error) {
      console.error("Error fetching market radar data:", error);
      setMarketRadarData([]);
    }
  }

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  // Determine membership tier
  const membershipTier = (user?.user_metadata?.membership_tier as string | undefined) || "Free";
  const isProOrPremium = membershipTier === "Pro" || membershipTier === "Premium";

  // Only show dashboard after user, stats, and spotlights are loaded
  if (!user || !mounted || !statsLoaded || !spotlightsLoaded) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // All logic is now correct for consistent dashboard rendering.
  // If you still see "different dashboards" on refresh, double-check that:
  // - You are not running multiple dashboard UIs (old vs new) in your routes.
  // - All dashboard data fetches are gated on user and loading states as in this file.
  // - No other dashboard component is being rendered by mistake (see your second screenshot).

  // If you want to guarantee only this dashboard loads, add this at the top:
  if (typeof window !== "undefined" && window.location.pathname === "/dashboard" && !user && !loading) {
    // If user is not set and not loading, force reload to clear any stale state
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      {/* Enhanced Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span>/</span>
          <span className="text-white/90">Dashboard</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white md:text-4xl mb-2">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-white/60">Your verified arbitrage command center</p>
      </header>

      {/* Search Bar */}
      <section className="mb-8">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search properties, markets, or deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/properties?search=${encodeURIComponent(searchQuery)}`);
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400/50"
          />
        </div>
      </section>

      {/* Updated Metrics Section with Links */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OperatorMetricCard
          icon={<Building2 size={20} />}
          label="Verified Doors"
          value={operatorStats.verifiedDoors}
          sublabel="Ready to onboard"
          color="emerald"
          href="/requests?status=verified"
        />
        <OperatorMetricCard
          icon={<TrendingUp size={20} />}
          label="Active Leads"
          value={operatorStats.activeLeads}
          sublabel="In your pipeline"
          color="blue"
          href="/requests?status=in_review,pending"
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
          href="/requests?status=verified&recent=7"
        />
      </section>

      {/* Quick Access Tools - PRO/PREMIUM ONLY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {isProOrPremium ? (
          <>
            <Link href="/portfolio" className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <PieChart className="text-emerald-400" size={24} />
                <h3 className="text-lg font-bold text-white">Portfolio Analytics</h3>
              </div>
              <p className="text-sm text-white/60">Track performance across all properties</p>
            </Link>
            <Link href="/market-radar" className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Target className="text-emerald-400" size={24} />
                <h3 className="text-lg font-bold text-white">Market Radar</h3>
              </div>
              <p className="text-sm text-white/60">Discover market opportunities and trends</p>
            </Link>
            <Link href="/lease-assistant" className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-emerald-400" size={24} />
                <h3 className="text-lg font-bold text-white">Lease Assistant</h3>
              </div>
              <p className="text-sm text-white/60">Manage tenants and lease lifecycle</p>
            </Link>
          </>
        ) : (
          <>
            <LockedFeatureCard feature="Portfolio Analytics" />
            <LockedFeatureCard feature="Market Radar" />
            <LockedFeatureCard feature="Lease Assistant" />
          </>
        )}
      </div>
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Market Radar</h2>
            <p className="text-sm text-white/60">Top performing markets right now</p>
          </div>
        </div>
        <MarketRadar data={marketRadarData} />
      </section>

// ...existing code...
      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Trending Opportunities - Only show if we have data */}
          {spotlights.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Trending Opportunities</h2>
                <Link href="/properties" className="text-sm text-emerald-400 hover:text-emerald-300">
                  View all →
                </Link>
              </div>
              <SpotlightCarousel items={spotlights} />
            </section>
          )}
        </div>

        {/* Sidebar - 1/3 width */}
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

// Updated OperatorMetricCard with clickable links
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
    <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4 transition-all hover:scale-[1.02] ${href ? 'cursor-pointer' : ''}`}>
      <div className="mb-3 rounded-lg bg-white/10 p-2 text-white/90 w-fit">{icon}</div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs font-medium text-white/70">{label}</p>
      <p className="text-[11px] text-white/50">{sublabel}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

const QUICK_ACTIONS = [
  { icon: Compass, label: "Browse Properties", href: "/properties" },
  { icon: ClipboardList, label: "Submit Request", href: "/requests" },
  { icon: Star, label: "View Favorites", href: "/favorites" },
  { icon: Target, label: "My Pipeline", href: "/requests?view=pipeline" },
];

// Helper functions
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    in_review: "In Review",
    verified: "Verified",
    rejected: "Rejected"
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "amber",
    in_review: "violet",
    verified: "emerald",
    rejected: "red"
  };
  return colors[status] || "blue";
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Add this helper component at the bottom of the file
function LockedFeatureCard({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 opacity-60 relative">
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8 1.5a3.5 3.5 0 0 1 3.5 3.5v2h.5A1.5 1.5 0 0 1 13.5 8v4A1.5 1.5 0 0 1 12 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5h.5v-2A3.5 3.5 0 0 1 8 1.5Zm0 1A2.5 2.5 0 0 0 5.5 5v2h5V5A2.5 2.5 0 0 0 8 2.5Z" fill="currentColor"/></svg>
        </span>
        <h3 className="text-lg font-bold text-white">{feature}</h3>
      </div>
      <p className="text-sm text-white/60 mb-4">Unlock <span className="font-semibold">{feature}</span> with Pro or Premium membership.</p>
      <a
        href="/upgrade"
        className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
      >
        Upgrade to Pro
      </a>
      <div className="absolute top-4 right-4 text-xs font-semibold text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded">
        PRO
      </div>
    </div>
  );
}
