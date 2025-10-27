"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MarketRadar() {
  const [markets, setMarkets] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function loadMarkets() {
      setLoading(true);
      setError(null);

      try {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error: fetchError } = await supabase
          .from("properties")
          .select("city,state,rent,verified")
          .eq("verified", true)
          .limit(50);

        if (fetchError) {
          console.error("MarketRadar fetch error:", fetchError);
          throw fetchError;
        }

        if (mounted.current) setMarkets(data || []);
      } catch (e: any) {
        console.error("Error fetching market data:", e);
        if (mounted.current) setError(e?.message || "Failed to load market data");
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    loadMarkets();
    return () => {
      mounted.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">Loading market data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-6">
        <div className="text-sm text-red-300">Error loading market data: {error}</div>
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">No market data available</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-bold text-white mb-4">Market Radar</h3>
      <div className="grid gap-3">
        {markets.slice(0, 12).map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>
              <div className="text-sm font-medium text-white">{m.city}, {m.state}</div>
              <div className="text-xs text-white/60">Avg rent: ${m.rent}</div>
            </div>
            <div className="text-xs text-white/50">{m.verified ? "Verified" : "Unverified"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}