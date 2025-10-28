"use client";

import React from "react";

type MarketRadarData = { city: string; state: string; count: number };

interface MarketRadarProps {
  data: MarketRadarData[];
}

const MarketRadar: React.FC<MarketRadarProps> = ({ data }) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {data.length === 0 ? (
        <p className="text-sm text-white/50">No market data available.</p>
      ) : (
        data.map((item, idx) => (
          <div
            key={idx}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300"
          >
            <span className="font-semibold">
              {item.city}, {item.state}
            </span>
            <span className="text-xs opacity-80">{item.count} listings</span>
          </div>
        ))
      )}
    </div>
  );
};

export default MarketRadar;