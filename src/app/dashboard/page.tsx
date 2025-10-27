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
  const router = useRouter();

  // --- NEW helper: detect missing supabase client-side config
  function isSupabaseConfiguredClientSide() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // only fetch user stats when we have a confirmed user
  useEffect(() => {
    if (!user || !supabase) return;
    fetchUserStats();
  }, [user]);

  // fetch spotlights only after user is known to avoid mixed UI on refresh
  useEffect(() => {
    if (!user || !supabase) return;
    fetchSpotlights();
  }, [user, supabase]);

  async function fetchUserStats() {
    if (!supabase || !user) return;

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
        // fallback to empty dataset so UI remains stable
        setOperatorStats((prev) => ({ ...prev, verifiedDoors: 0, activeLeads: 0, requestsUsed: 0 }));
        setRecentActivity([]);
        return;
      }

      // Fetch user profile to get request limit
      const { data: profile, error: profileError, status: profileStatus } = await supabase
        .from("user_profiles")
        .select("requests_limit")
        .eq("user_id", user.id)
        .single();

      const requestLimit = profile?.requests_limit || 50;
      // Calculate stats from actual user data
      const allRequests = requests || [];
      const totalRequests = allRequests.length;
      const verifiedCount = allRequests.filter(r => r.status === "verified").length;
      const activeLeadsCount = allRequests.filter(r => r.status === "in_review" || r.status === "pending").length;

      // Count recently verified (last 7 days)
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
      // keep UI stable
    }
  }

  async function fetchSpotlights() {
    if (!isSupabaseConfiguredClientSide() || !supabase) {
      console.warn("Supabase client config missing — skipping spotlight fetch.");
      setSpotlights([]); // safe fallback
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
    }
  }

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  if (loading || !mounted) {
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

      {/* Feature Cards - NEW */}
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/portfolio"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/8 hover:border-emerald-400/30 hover:shadow-[0_10px_28px_-8px_rgba(52,211,153,0.18)]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-all group-hover:scale-110 group-hover:bg-emerald-500/20">
            <PieChart size={24} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">Portfolio Analytics</h3>
          <p className="text-sm text-white/60">Track performance across all properties</p>
        </Link>

        <Link
          href="/market-radar"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/8 hover:border-emerald-400/30 hover:shadow-[0_10px_28px_-8px_rgba(52,211,153,0.18)]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-all group-hover:scale-110 group-hover:bg-emerald-500/20">
            <Target size={24} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">Market Radar</h3>
          <p className="text-sm text-white/60">Discover market opportunities and trends</p>
        </Link>

        <Link
          href="/lease-assistant"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/8 hover:border-emerald-400/30 hover:shadow-[0_10px_28px_-8px_rgba(52,211,153,0.18)]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-all group-hover:scale-110 group-hover:bg-emerald-500/20">
            <Users size={24} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">Lease Assistant</h3>
          <p className="text-sm text-white/60">Manage tenants and lease lifecycle</p>
        </Link>
      </section>

      {/* Market Radar Section - Keep existing but maybe remove since we have card above */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Market Radar</h2>
            <p className="text-sm text-white/60">Top performing markets right now</p>
          </div>
        </div>
        <MarketRadar />
      </section>

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
