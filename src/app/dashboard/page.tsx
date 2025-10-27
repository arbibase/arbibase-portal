"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Bell, MapPin, BarChart3, Calculator, Gift, FileText, TrendingUp, Building2, Search, ArrowRight } from "lucide-react";
import SpotlightCarousel from "@/components/SpotlightCarousel";
import MarketRadar from "@/components/MarketRadar";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ savedProperties: 0, activeSearches: 0, recentRequests: 0, requestsRemaining: 25 });
  const [spotlightItems, setSpotlightItems] = useState<any[]>([]);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    if (!supabase) { router.replace("/login"); return; }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.replace("/login"); return; }
    setUser(data.user);
    await loadUserStats(data.user.id);
    setLoading(false);
  }

  async function loadUserStats(userId: string) {
    if (!supabase) return;
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single();
    if (profile) {
      setStats({
        savedProperties: profile.saved_properties?.length || 0,
        activeSearches: profile.saved_searches?.length || 0,
        recentRequests: profile.requests_used || 0,
        requestsRemaining: (profile.requests_limit - profile.requests_used) || 25
      });
    }
    const { data: properties } = await supabase.from("properties").select("*").limit(5);
    if (properties) setSpotlightItems(properties);
  }

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
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">
          Welcome back, {user?.user_metadata?.full_name || "Investor"}
        </h1>
        <p className="mt-1 text-white/60">
          Here's what's happening with your investment portfolio
        </p>
      </header>

      {/* Stats Grid */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 size={20} className="text-blue-400" />}
          label="Saved Properties"
          value={stats.savedProperties}
          color="blue"
        />
        <StatCard
          icon={<Bell size={20} className="text-emerald-400" />}
          label="Active Searches"
          value={stats.activeSearches}
          color="emerald"
        />
        <StatCard
          icon={<FileText size={20} className="text-violet-400" />}
          label="Recent Requests"
          value={stats.recentRequests}
          color="violet"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-amber-400" />}
          label="Requests Remaining"
          value={stats.requestsRemaining}
          color="amber"
        />
      </section>

      {/* Quick Actions */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/properties"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Search size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Browse Properties</p>
              <p className="text-xs text-white/60">Explore verified deals</p>
            </div>
          </Link>

          <Link
            href="/saved-searches"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Bell size={20} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Create Alert</p>
              <p className="text-xs text-white/60">Get notified of deals</p>
            </div>
          </Link>

          <Link
            href="/calculators"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Calculator size={20} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Calculators</p>
              <p className="text-xs text-white/60">ROI & analysis tools</p>
            </div>
          </Link>

          <Link
            href="/referrals"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Gift size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Earn Rewards</p>
              <p className="text-xs text-white/60">Refer friends</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Spotlight Properties */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Featured Properties</h2>
            <p className="text-sm text-white/60">Hand-picked investment opportunities</p>
          </div>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <SpotlightCarousel items={spotlightItems} />
      </section>

      {/* Market Radar */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Market Radar</h2>
            <p className="text-sm text-white/60">Top performing markets this week</p>
          </div>
          <Link
            href="/market-reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            View Reports <ArrowRight size={16} />
          </Link>
        </div>
        <MarketRadar />
      </section>

      {/* Premium Features Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6"><h2 className="text-xl font-bold text-white">Premium Features</h2><p className="text-sm text-white/60">Unlock powerful tools for your investment strategy</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/saved-searches" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="mb-3 rounded-lg bg-blue-500/10 p-2 w-fit"><Bell size={20} className="text-blue-400" /></div><h3 className="font-semibold text-white mb-1">Saved Searches</h3><p className="text-xs text-white/60">Get alerts for matching properties</p></Link>
          <Link href="/properties/map" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="mb-3 rounded-lg bg-emerald-500/10 p-2 w-fit"><MapPin size={20} className="text-emerald-400" /></div><h3 className="font-semibold text-white mb-1">Map View</h3><p className="text-xs text-white/60">Explore properties visually</p></Link>
          <Link href="/analytics" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="mb-3 rounded-lg bg-violet-500/10 p-2 w-fit"><BarChart3 size={20} className="text-violet-400" /></div><h3 className="font-semibold text-white mb-1">Analytics</h3><p className="text-xs text-white/60">Track your portfolio performance</p></Link>
          <Link href="/calculators" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="mb-3 rounded-lg bg-cyan-500/10 p-2 w-fit"><Calculator size={20} className="text-cyan-400" /></div><h3 className="font-semibold text-white mb-1">Calculators</h3><p className="text-xs text-white/60">ROI, mortgage, cash flow tools</p></Link>
          <Link href="/referrals" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="mb-3 rounded-lg bg-amber-500/10 p-2 w-fit"><Gift size={20} className="text-amber-400" /></div><h3 className="font-semibold text-white mb-1">Referrals</h3><p className="text-xs text-white/60">Earn rewards for inviting friends</p></Link>
          <Link href="/market-reports" className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="mb-3 rounded-lg bg-red-500/10 p-2 w-fit"><FileText size={20} className="text-red-400" /></div><h3 className="font-semibold text-white mb-1">Market Reports</h3><p className="text-xs text-white/60">Weekly insights and trends</p></Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string; }) {
  const colorMap: Record<string, string> = { blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20", emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20", violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20", amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20" };
  return <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4`}><div className="mb-2 rounded-lg bg-white/10 p-2 w-fit">{icon}</div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs font-medium text-white/70">{label}</p></div>;
}