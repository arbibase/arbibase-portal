"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Compass, CheckCircle2, Star, Building2, ClipboardList, CircleCheckBig,
  Mail, Sparkles, TrendingUp, Target
} from "lucide-react";
import SpotlightCarousel, { SpotlightCard } from "@/components/SpotlightCarousel";

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

function recentlyVerified(verified_at?: string) {
  if (!verified_at) return false;
  const t = Date.parse(verified_at);
  return Number.isFinite(t) && Date.now() - t < 1000 * 60 * 60 * 24 * 14;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [operatorStats, setOperatorStats] = useState({
    verifiedDoors: 0,
    activeLeads: 0,
    requestsUsed: 0,
    requestsLimit: 50,
    recentlyVerified: 0,
    tasksOverdue: 0
  });
  const [recentActivity, setRecentActivity] = useState<PropertyRequest[]>([]);
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
    fetchUserStats();
  }, [user]);

  async function fetchUserStats() {
    if (!supabase || !user) return;

    try {
      // Fetch user's property requests
      const { data: requests, error: requestsError } = await supabase
        .from("property_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
        return;
      }

      // Fetch user profile to get request limit
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("requests_limit")
        .eq("user_id", user.id)
        .single();

      const requestLimit = profile?.requests_limit || 50;

      // Calculate stats from actual user data
      const allRequests = requests || [];
      const totalRequests = allRequests.length;
      const verifiedCount = allRequests.filter(r => r.status === "verified").length;
      const activeLeadsCount = allRequests.filter(r => 
        r.status === "in_review" || r.status === "pending"
      ).length;

      // Count recently verified (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentlyVerifiedCount = allRequests.filter(r => 
        r.status === "verified" && new Date(r.updated_at) > sevenDaysAgo
      ).length;

      setOperatorStats({
        verifiedDoors: verifiedCount,
        activeLeads: activeLeadsCount,
        requestsUsed: totalRequests,
        requestsLimit: requestLimit,
        recentlyVerified: recentlyVerifiedCount,
        tasksOverdue: 0 // Can be calculated based on created_at + 72 hours if still pending
      });

      // Set recent activity (last 5 requests)
      setRecentActivity(allRequests.slice(0, 5));

    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  }

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!full.trim()) return user?.email?.split("@")[0] || "there";
    return full.split(" ")[0];
  }, [user]);

  const spotlights: Spotlight[] = [
    {
      name: "Miami Beach Condo",
      location: "Miami, FL",
      status: "HOT",
      summary: "Verified landlord approval for 2BR/2BA in prime location",
      photo: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400"
    },
    {
      name: "Austin Downtown Loft",
      location: "Austin, TX",
      status: "NEW",
      summary: "STR-friendly building with high occupancy rates",
      photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400"
    },
    {
      name: "Nashville Music Row",
      location: "Nashville, TN",
      status: "VERIFIED",
      summary: "Premium location near entertainment district",
      photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400"
    }
  ];

  if (loading) {
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
            <ClipboardList size={16} /> New Request
          </Link>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,.3)] hover:bg-emerald-600"
          >
            <Sparkles size={16} /> Browse Properties
          </Link>
        </div>
      </header>

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

      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Empty State OR Content */}
          {operatorStats.verifiedDoors === 0 ? (
            <section className="rounded-2xl border border-emerald-400/20 bg-linear-to-br from-emerald-500/10 via-transparent to-sky-500/10 p-8 text-center">
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
          ) : (
            /* Recent Activity Table - Only show if user has properties */
            <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                  <Link href="/requests" className="text-sm text-emerald-400 hover:text-emerald-300">
                    View all →
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                {recentActivity.length > 0 ? (
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
                      {recentActivity.map((request) => (
                        <ActivityRow
                          key={request.id}
                          property={`${request.address}, ${request.city}`}
                          type={request.property_type || "Request"}
                          status={getStatusLabel(request.status)}
                          statusColor={getStatusColor(request.status)}
                          updated={getTimeAgo(request.updated_at)}
                          href={`/requests/${request.id}`}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-12 text-center text-white/50">
                    <p>No recent activity</p>
                    <Link href="/request-verification" className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300">
                      Submit your first request →
                    </Link>
                  </div>
                )}
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
    <div className={`rounded-2xl border bg-gradient-to-br ${colorMap[color]} p-4 transition-all hover:scale-[1.02] ${href ? 'cursor-pointer' : ''}`}>
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
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    red: "bg-red-500/10 text-red-300 border-red-500/20"
  };

  return (
    <tr className="hover:bg-white/5">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-white">{property}</p>
          <p className="text-xs text-white/50">{type}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColorMap[statusColor]}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-white/60">{updated}</td>
      <td className="px-6 py-4 text-right">
        <Link href={href} className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
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
