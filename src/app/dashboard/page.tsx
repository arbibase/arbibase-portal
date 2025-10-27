"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SpotlightCarousel from "@/components/SpotlightCarousel";
import MarketRadar from "@/components/MarketRadar";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    if (!supabase) { router.replace("/login"); return; }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.replace("/login"); return; }
    setLoading(false);
  }

  if (loading) {
    return <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8"><div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div><p className="mt-4 text-sm text-white/70">Loading...</p></div></div></div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      <SpotlightCarousel />
      <MarketRadar />
    </div>
  );
}