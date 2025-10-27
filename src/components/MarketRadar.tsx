"use client";

import { useState, useEffect } from "react";
import { TrendingUp, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

type MarketData = {
  city: string;
  state: string;
  count: number;
  avgRent: number;
  verifiedCount: number;
};

export default function MarketRadar() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  async function fetchMarketData() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all verified properties
      const { data: properties, error } = await supabase
        .from("properties")
        .select("city, state, rent, verified")
        .eq("verified", true);

      if (error) {
        console.error("Error fetching market data:", error);
        setMarkets([]);
        setLoading(false);
        return;
      }

      if (!properties || properties.length === 0) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      // Group by city and calculate metrics
      const marketMap = new Map<string, MarketData>();

      properties.forEach((prop) => {
        const key = `${prop.city}, ${prop.state}`;
        
        if (marketMap.has(key)) {
          const existing = marketMap.get(key)!;
          existing.count += 1;
          existing.avgRent = Math.round((existing.avgRent * (existing.count - 1) + prop.rent) / existing.count);
          if (prop.verified) existing.verifiedCount += 1;
        } else {
          marketMap.set(key, {
            city: prop.city,
            state: prop.state,
            count: 1,
            avgRent: prop.rent,
            verifiedCount: prop.verified ? 1 : 0,
          });
        }
      });

      // Convert to array and sort by count (descending)
      const sortedMarkets = Array.from(marketMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 markets

      setMarkets(sortedMarkets);
      setLoading(false);
    } catch (error) {
      console.error("Unexpected error fetching market data:", error);
      setMarkets([]);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-sm text-white/60">No verified properties yet</p>
        <p className="text-xs text-white/40 mt-1">Market data will appear as properties are verified</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {markets.map((market, index) => (
        <div key={`${market.city}-${market.state}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-white/40" />
                <span className="font-semibold text-white">{market.city}, {market.state}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                <span>{market.count} {market.count === 1 ? 'property' : 'properties'}</span>
                <span>•</span>
                <span>Avg ${market.avgRent.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp size={16} />
            <span className="text-sm font-semibold">{market.verifiedCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}