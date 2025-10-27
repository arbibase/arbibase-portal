"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SpotlightCarousel from "@/components/SpotlightCarousel";
import MarketRadar from "@/components/MarketRadar";
import { Building2, Search, Calculator, Gift, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [spotlightItems, setSpotlightItems] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (!supabase) {
          console.warn("supabase client not initialized");
          setLoading(false);
          return;
        }

        // get current user
        const { data: authData } = await supabase.auth.getUser();
        if (!mounted) return;
        const user = authData?.user;
        if (!user) {
          // no client auth -> allow page to render (will redirect elsewhere in app)
          setLoading(false);
          return;
        }

        // fetch profile (non-blocking)
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;
        setUserProfile(profile || null);
      } catch (err) {
        console.error("Error loading dashboard profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">Dashboard</h1>
        <p className="mt-1 text-white/60">Quick access to properties, analytics and tools</p>
      </header>

      {/* Quick Actions */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/properties" className="group flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:bg-white/6">
            <div className="rounded-lg bg-emerald-500/10 p-2"><Search size={20} className="text-emerald-400" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Browse Properties</p>
              <p className="text-xs text-white/60">Find verified opportunities</p>
            </div>
          </Link>

          <Link href="/calculators" className="group flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:bg-white/6">
            <div className="rounded-lg bg-violet-500/10 p-2"><Calculator size={20} className="text-violet-400" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Calculators</p>
              <p className="text-xs text-white/60">ROI & cashflow tools</p>
            </div>
          </Link>

          <Link href="/saved-searches" className="group flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:bg-white/6">
            <div className="rounded-lg bg-amber-500/10 p-2"><Gift size={20} className="text-amber-400" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Saved Searches</p>
              <p className="text-xs text-white/60">Deal alerts</p>
            </div>
          </Link>

          <Link href="/properties/map" className="group flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:bg-white/6">
            <div className="rounded-lg bg-cyan-500/10 p-2"><Building2 size={20} className="text-cyan-400" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Map View</p>
              <p className="text-xs text-white/60">Explore properties geographically</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Spotlight list (component will fetch if not provided) */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Featured Properties</h2>
            <p className="text-sm text-white/60">Hand-picked opportunities</p>
          </div>
          <Link href="/properties" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <SpotlightCarousel items={spotlightItems ?? undefined} />
      </section>

      {/* Market radar */}
      <section className="mb-8">
        <MarketRadar />
      </section>
    </div>
  );
}