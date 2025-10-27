"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RadarItem } from "@/types/roi";

export default function MarketRadar() {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRadar();
  }, []);

  async function fetchRadar() {
    try {
      const response = await fetch('/api/market-radar?top=5');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Market radar error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 w-32 animate-pulse rounded-full bg-white/5" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-white/50">No market data available yet.</p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <button
          key={item.marketId}
          onClick={() => router.push(`/properties?market=${item.marketId}`)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:scale-105 ${
            item.trend === 'up' 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
              : item.trend === 'down'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              : 'border-white/20 bg-white/5 text-white/70'
          }`}
          data-event="radar-click"
          data-market={item.marketId}
        >
          <span className="font-semibold">{item.label}</span>
          <span className="text-xs opacity-80">{item.score}</span>
          {item.trend === 'up' && <TrendingUp size={14} />}
          {item.trend === 'down' && <TrendingDown size={14} />}
          {item.trend === 'flat' && <Minus size={14} />}
        </button>
      ))}
    </div>
  );
}