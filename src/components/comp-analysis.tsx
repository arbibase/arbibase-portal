"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, MapPin, Star, DollarSign, Users, Home } from "lucide-react";

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  rent: number;
  beds: number;
  baths: number;
  lat?: number;
  lng?: number;
};

type Comp = {
  id: string;
  name: string;
  address: string;
  nightlyRate: number;
  reviewCount: number;
  rating: number;
  occupancyEstimate: number;
  monthlyRevenue: number;
  amenities: string[];
  distance: number;
  listingUrl?: string;
};

type CompAnalysisProps = {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
};

export default function CompAnalysis({ property, isOpen, onClose }: CompAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [comps, setComps] = useState<Comp[]>([]);
  const [stats, setStats] = useState({
    avgRate: 0,
    medianRate: 0,
    p90Rate: 0,
    p10Rate: 0,
    avgOccupancy: 0,
    avgRevenue: 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchComps();
    }
  }, [isOpen, property.id]);

  async function fetchComps() {
    setLoading(true);
    
    // TODO: Replace with real API call to Airbtics/AirDNA or custom scraper
    // For now, generate mock data based on property characteristics
    const mockComps: Comp[] = Array.from({ length: 10 }, (_, i) => {
      const baseRate = 80 + property.beds * 25 + property.baths * 15;
      const variance = (Math.random() - 0.5) * 40;
      const nightlyRate = Math.round(baseRate + variance);
      const occupancy = 60 + Math.random() * 30;
      
      return {
        id: `comp-${i}`,
        name: `${property.beds}BR ${property.baths}BA in ${property.city}`,
        address: `${Math.floor(Math.random() * 9000) + 1000} ${["Main", "Oak", "Elm", "Pine"][i % 4]} St`,
        nightlyRate,
        reviewCount: Math.floor(Math.random() * 200) + 10,
        rating: 4.5 + Math.random() * 0.5,
        occupancyEstimate: Math.round(occupancy),
        monthlyRevenue: Math.round(nightlyRate * 30 * (occupancy / 100)),
        amenities: ["WiFi", "Kitchen", "Washer", "Parking"].slice(0, Math.floor(Math.random() * 4) + 1),
        distance: Math.random() * 2,
        listingUrl: `https://airbnb.com/rooms/${Math.random().toString(36).substring(7)}`,
      };
    });

    setComps(mockComps);

    // Calculate statistics
    const rates = mockComps.map(c => c.nightlyRate).sort((a, b) => a - b);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const medianRate = rates[Math.floor(rates.length / 2)];
    const p90Rate = rates[Math.floor(rates.length * 0.9)];
    const p10Rate = rates[Math.floor(rates.length * 0.1)];
    const avgOccupancy = mockComps.reduce((a, b) => a + b.occupancyEstimate, 0) / mockComps.length;
    const avgRevenue = mockComps.reduce((a, b) => a + b.monthlyRevenue, 0) / mockComps.length;

    setStats({
      avgRate: Math.round(avgRate),
      medianRate: Math.round(medianRate),
      p90Rate: Math.round(p90Rate),
      p10Rate: Math.round(p10Rate),
      avgOccupancy: Math.round(avgOccupancy),
      avgRevenue: Math.round(avgRevenue),
    });

    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-3xl bg-[#0b141d] border-l border-white/10 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0b141d]/95 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="text-emerald-400" size={20} />
                <h2 className="text-xl font-bold text-white">Comparable Analysis</h2>
              </div>
              <p className="text-sm text-white/60">{property.name}</p>
              <p className="text-xs text-white/50">{property.city}, {property.state}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
                <p className="mt-4 text-sm text-white/70">Analyzing comparable properties...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-4">Market Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-1">Median Nightly Rate</div>
                    <div className="text-2xl font-bold text-emerald-400">${stats.medianRate}</div>
                    <div className="text-[10px] text-white/50 mt-1">
                      Range: ${stats.p10Rate}-${stats.p90Rate}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-1">Avg Occupancy</div>
                    <div className="text-2xl font-bold text-white">{stats.avgOccupancy}%</div>
                    <div className="text-[10px] text-white/50 mt-1">
                      ~{Math.round(30 * stats.avgOccupancy / 100)} nights/mo
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-1">Est. Revenue</div>
                    <div className="text-2xl font-bold text-white">${stats.avgRevenue}</div>
                    <div className="text-[10px] text-white/50 mt-1">Monthly avg</div>
                  </div>
                </div>
              </section>

              {/* Rate Distribution Chart */}
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-4">Rate Distribution</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">10th Percentile</span>
                    <span className="text-white/90">${stats.p10Rate}/night</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500/30 via-emerald-500 to-emerald-500/30" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Median</span>
                    <span className="font-semibold text-emerald-400">${stats.medianRate}/night</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">90th Percentile</span>
                    <span className="text-white/90">${stats.p90Rate}/night</span>
                  </div>
                </div>
              </section>

              {/* Pricing Recommendation */}
              <section className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <h3 className="text-sm font-bold text-white mb-2">Pricing Recommendation</h3>
                <p className="text-sm text-white/80 mb-3">
                  Based on {comps.length} comparable properties within 1 mile:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg bg-white/10 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-1">Conservative</div>
                    <div className="text-xl font-bold text-white">${stats.p10Rate}</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 p-3">
                    <div className="text-xs text-emerald-300 mb-1">Recommended</div>
                    <div className="text-xl font-bold text-emerald-300">${stats.medianRate}</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/10 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-1">Aggressive</div>
                    <div className="text-xl font-bold text-white">${stats.p90Rate}</div>
                  </div>
                </div>
              </section>

              {/* Comparable Listings */}
              <section>
                <h3 className="text-sm font-bold text-white mb-3">Top Performing Comps</h3>
                <div className="space-y-3">
                  {comps.slice(0, 5).map((comp) => (
                    <CompCard key={comp.id} comp={comp} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompCard({ comp }: { comp: Comp }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/8 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm mb-1">{comp.name}</h4>
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {comp.distance.toFixed(1)} mi away
            </span>
            <span className="flex items-center gap-1">
              <Star size={10} fill="currentColor" className="text-amber-400" />
              {comp.rating.toFixed(1)} ({comp.reviewCount})
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-emerald-400">${comp.nightlyRate}</div>
          <div className="text-[10px] text-white/50">per night</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div className="text-xs">
          <span className="text-white/60">Est. Occupancy: </span>
          <span className="font-semibold text-white">{comp.occupancyEstimate}%</span>
        </div>
        <div className="text-xs">
          <span className="text-white/60">Monthly Rev: </span>
          <span className="font-semibold text-white">${comp.monthlyRevenue}</span>
        </div>
      </div>

      {comp.amenities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {comp.amenities.map((amenity) => (
            <span
              key={amenity}
              className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/70"
            >
              {amenity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
