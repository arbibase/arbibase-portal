"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Building2, TrendingUp, DollarSign, Search, Calculator, MapPin, AlertCircle, ArrowRight, FileText } from "lucide-react";
import SpotlightCarousel from "@/components/SpotlightCarousel";
import MarketRadar from "@/components/MarketRadar";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ activeListings: 0, monthlyRevenue: 0, avgOccupancy: 0, requestsRemaining: 25 });
  const [spotlightItems, setSpotlightItems] = useState<any[]>([]);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    if (!supabase) { router.replace("/login"); return; }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.replace("/login"); return; }
    setUser(data.user);
    await loadDashboardData(data.user.id);
    setLoading(false);
  }

  async function loadDashboardData(userId: string) {
    if (!supabase) return;
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single();
    if (profile) {
      setStats({ activeListings: profile.active_listings || 0, monthlyRevenue: profile.monthly_revenue || 0, avgOccupancy: profile.avg_occupancy || 0, requestsRemaining: (profile.requests_limit - profile.requests_used) || 25 });
    }
    const { data: properties } = await supabase.from("properties").select("*").eq("is_spotlight", true).limit(5);
    if (properties) setSpotlightItems(properties);
  }

  if (loading) {
    return <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8"><div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div><p className="mt-4 text-sm text-white/70">Loading dashboard...</p></div></div></div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      <header className="mb-8"><h1 className="text-3xl font-extrabold text-white md:text-4xl">Welcome back, {user?.user_metadata?.full_name || "Operator"}</h1><p className="mt-1 text-white/60">Manage your rental arbitrage portfolio and find new opportunities</p></header>
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard icon={<Building2 size={20} className="text-blue-400" />} label="Active Listings" value={stats.activeListings} sublabel="Short-term rentals" color="blue" /><StatCard icon={<DollarSign size={20} className="text-emerald-400" />} label="Monthly Revenue" value={`$${stats.monthlyRevenue.toLocaleString()}`} sublabel="Gross booking value" color="emerald" /><StatCard icon={<TrendingUp size={20} className="text-violet-400" />} label="Avg Occupancy" value={`${stats.avgOccupancy}%`} sublabel="Last 30 days" color="violet" /><StatCard icon={<FileText size={20} className="text-amber-400" />} label="Verifications Left" value={stats.requestsRemaining} sublabel="This month" color="amber" /></section>
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-bold text-white mb-4">Operator Tools</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Link href="/properties" className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="rounded-lg bg-emerald-500/10 p-2"><Search size={20} className="text-emerald-400" /></div><div className="flex-1"><p className="font-semibold text-white text-sm">Find Properties</p><p className="text-xs text-white/60">Search verified deals</p></div></Link><Link href="/calculators" className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="rounded-lg bg-violet-500/10 p-2"><Calculator size={20} className="text-violet-400" /></div><div className="flex-1"><p className="font-semibold text-white text-sm">ROI Calculator</p><p className="text-xs text-white/60">Analyze deal numbers</p></div></Link><Link href="/properties/map" className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="rounded-lg bg-cyan-500/10 p-2"><MapPin size={20} className="text-cyan-400" /></div><div className="flex-1"><p className="font-semibold text-white text-sm">Market Map</p><p className="text-xs text-white/60">Explore by location</p></div></Link><Link href="/saved-searches" className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"><div className="rounded-lg bg-amber-500/10 p-2"><AlertCircle size={20} className="text-amber-400" /></div><div className="flex-1"><p className="font-semibold text-white text-sm">Deal Alerts</p><p className="text-xs text-white/60">Get notified</p></div></Link></div></section>
      <section className="mb-8"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">Top Deals This Week</h2><p className="text-sm text-white/60">Verified properties ready for arbitrage</p></div><Link href="/properties" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300">View All <ArrowRight size={16} /></Link></div><SpotlightCarousel items={spotlightItems} /></section>
      <section className="mb-8"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">Market Intelligence</h2><p className="text-sm text-white/60">Best performing STR markets this month</p></div><Link href="/market-reports" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300">Full Report <ArrowRight size={16} /></Link></div><MarketRadar /></section>
      <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-6"><h3 className="text-lg font-bold text-white mb-4">Deal Pipeline</h3><div className="space-y-3"><PipelineItem status="analyzing" address="123 Oak St, Austin TX" /><PipelineItem status="verifying" address="456 Elm Ave, Nashville TN" /><PipelineItem status="ready" address="789 Pine Rd, Denver CO" /></div><Link href="/requests" className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">View All Requests <ArrowRight size={14} /></Link></div><div className="rounded-2xl border border-white/10 bg-white/5 p-6"><h3 className="text-lg font-bold text-white mb-4">Quick Tips</h3><div className="space-y-3"><TipCard title="Verify Before Leasing" desc="Always run comps analysis before signing a lease" /><TipCard title="Check Local Laws" desc="Ensure STR regulations allow rental arbitrage" /><TipCard title="Calculate Buffer" desc="Account for 10-15% vacancy in your projections" /></div></div></section>
    </div>
  );
}

function StatCard({ icon, label, value, sublabel, color }: any) {
  const colorMap: Record<string, string> = { blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20", emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20", violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20", amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20" };
  return <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4`}><div className="mb-2 rounded-lg bg-white/10 p-2 w-fit">{icon}</div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs font-medium text-white/70">{label}</p><p className="text-[10px] text-white/50 mt-0.5">{sublabel}</p></div>;
}

function PipelineItem({ status, address }: { status: string; address: string }) {
  const statusConfig: Record<string, any> = { analyzing: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Analyzing" }, verifying: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Verifying" }, ready: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Ready" } };
  const config = statusConfig[status] || statusConfig.analyzing;
  return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"><div><p className="text-sm font-medium text-white">{address}</p><p className="text-xs text-white/50 mt-0.5">Submitted 2 days ago</p></div><span className={`rounded-full ${config.bg} px-2 py-1 text-xs font-semibold ${config.color}`}>{config.label}</span></div>;
}

function TipCard({ title, desc }: { title: string; desc: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-sm font-semibold text-white mb-1">{title}</p><p className="text-xs text-white/60">{desc}</p></div>;
}