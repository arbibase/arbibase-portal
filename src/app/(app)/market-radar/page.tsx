"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Map as MapIcon, TrendingUp, DollarSign, Home, Filter,
  ChevronRight, Sparkles, AlertCircle, Target, Zap
} from "lucide-react";

type MarketMetrics = {
  market: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  avgRent: number;
  avgStrRate: number;
  spread: number;
  spreadPercent: number;
  propertyCount: number;
  avgCoc: number;
  riskScore: number;
  trend: "up" | "down" | "stable";
  score: number;
};

export default function MarketRadarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<MarketMetrics[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<MarketMetrics[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketMetrics | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);

  // Filters
  const [minSpread, setMinSpread] = useState("");
  const [minScore, setMinScore] = useState("70");
  const [sortBy, setSortBy] = useState<"score" | "spread" | "coc">("score");

  useEffect(() => {
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (mapRef.current && !googleMapRef.current) {
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (googleMapRef.current && markets.length > 0) {
      updateMapMarkers();
    }
  }, [filteredMarkets]);

  async function checkAuth() {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.replace("/login");
      return;
    }
    setLoading(false);
    fetchMarketData();
  }

  async function fetchMarketData() {
    // TODO: Replace with real API call
    const mockData: MarketMetrics[] = [
      {
        market: "Austin, TX",
        city: "Austin",
        state: "TX",
        lat: 30.2672,
        lng: -97.7431,
        avgRent: 1800,
        avgStrRate: 185,
        spread: 3750,
        spreadPercent: 108,
        propertyCount: 247,
        avgCoc: 42,
        riskScore: 25,
        trend: "up",
        score: 92
      },
      {
        market: "Tampa, FL",
        city: "Tampa",
        state: "FL",
        lat: 27.9506,
        lng: -82.4572,
        avgRent: 1650,
        avgStrRate: 165,
        spread: 3300,
        spreadPercent: 100,
        propertyCount: 189,
        avgCoc: 38,
        riskScore: 30,
        trend: "up",
        score: 88
      },
      {
        market: "Nashville, TN",
        city: "Nashville",
        state: "TN",
        lat: 36.1627,
        lng: -86.7816,
        avgRent: 1900,
        avgStrRate: 195,
        spread: 3950,
        spreadPercent: 108,
        propertyCount: 312,
        avgCoc: 45,
        riskScore: 20,
        trend: "up",
        score: 95
      },
      {
        market: "Phoenix, AZ",
        city: "Phoenix",
        state: "AZ",
        lat: 33.4484,
        lng: -112.0740,
        avgRent: 1550,
        avgStrRate: 145,
        spread: 2800,
        spreadPercent: 81,
        propertyCount: 156,
        avgCoc: 32,
        riskScore: 35,
        trend: "stable",
        score: 78
      },
      {
        market: "Atlanta, GA",
        city: "Atlanta",
        state: "GA",
        lat: 33.7490,
        lng: -84.3880,
        avgRent: 1600,
        avgStrRate: 155,
        spread: 3050,
        spreadPercent: 91,
        propertyCount: 223,
        avgCoc: 35,
        riskScore: 28,
        trend: "up",
        score: 85
      },
      {
        market: "Denver, CO",
        city: "Denver",
        state: "CO",
        lat: 39.7392,
        lng: -104.9903,
        avgRent: 2100,
        avgStrRate: 175,
        spread: 3150,
        spreadPercent: 50,
        propertyCount: 134,
        avgCoc: 28,
        riskScore: 40,
        trend: "down",
        score: 65
      }
    ];

    setMarkets(mockData);
    setFilteredMarkets(mockData);
  }

  useEffect(() => {
    let filtered = [...markets];

    if (minSpread) {
      filtered = filtered.filter(m => m.spread >= parseInt(minSpread));
    }

    if (minScore) {
      filtered = filtered.filter(m => m.score >= parseInt(minScore));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "spread") return b.spread - a.spread;
      if (sortBy === "coc") return b.avgCoc - a.avgCoc;
      return 0;
    });

    setFilteredMarkets(filtered);
  }, [minSpread, minScore, sortBy, markets]);

  function initializeMap() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || typeof window === "undefined") return;

    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.onload = () => createMap();
      document.head.appendChild(script);
    } else {
      createMap();
    }
  }

  function createMap() {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 37.0902, lng: -95.7129 }, // Center of US
      zoom: 5,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0b141d" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0b141d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
        { featureType: "water", stylers: [{ color: "#082f3b" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    googleMapRef.current = map;
    updateMapMarkers();
  }

  function updateMapMarkers() {
    if (!googleMapRef.current) return;

    filteredMarkets.forEach(market => {
      const color = market.score >= 85 ? "#10b981" : market.score >= 70 ? "#f59e0b" : "#6b7280";
      const scale = market.score >= 85 ? 20 : market.score >= 70 ? 16 : 12;

      const marker = new google.maps.Marker({
        position: { lat: market.lat, lng: market.lng },
        map: googleMapRef.current!,
        title: market.market,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          scale: scale,
        },
        label: {
          text: market.score.toString(),
          color: "#ffffff",
          fontSize: "11px",
          fontWeight: "bold",
        }
      });

      marker.addListener("click", () => {
        setSelectedMarket(market);
      });
    });
  }

  function getScoreColor(score: number) {
    if (score >= 85) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-white/60";
  }

  function getScoreBg(score: number) {
    if (score >= 85) return "bg-emerald-500/10 border-emerald-400/30";
    if (score >= 70) return "bg-amber-500/10 border-amber-400/30";
    return "bg-white/5 border-white/10";
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading market data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Market Radar</span>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl flex items-center gap-3">
              <Target className="text-emerald-400" size={32} />
              Market Radar
            </h1>
            <p className="mt-1 text-white/60">
              Real-time arbitrage opportunity scoring across {filteredMarkets.length} metros
            </p>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-white/70">Min Spread</label>
              <input
                type="number"
                placeholder="$2,000"
                value={minSpread}
                onChange={(e) => setMinSpread(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-white/70">Min Score</label>
              <input
                type="number"
                placeholder="70"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-white/70">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="score" className="bg-[#0b141d]">Opportunity Score</option>
                <option value="spread" className="bg-[#0b141d]">Spread</option>
                <option value="coc" className="bg-[#0b141d]">Avg CoC</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Map */}
        <div className="space-y-4">
          <div ref={mapRef} className="h-[600px] rounded-2xl border border-white/10 bg-white/5">
            {!googleMapRef.current && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-white/40">
                  <MapIcon size={48} className="mx-auto mb-4" />
                  <p className="text-sm">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold text-white mb-3">Market Score Legend</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-white/70">85+ = Hot Market</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-amber-500"></div>
                <span className="text-xs text-white/70">70-84 = Solid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-gray-500"></div>
                <span className="text-xs text-white/70">&lt;70 = Caution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market List */}
        <div className="space-y-3 max-h-[680px] overflow-y-auto">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.market}
              market={market}
              onClick={() => setSelectedMarket(market)}
              isSelected={selectedMarket?.market === market.market}
            />
          ))}
        </div>
      </div>

      {/* Market Detail Modal */}
      {selectedMarket && (
        <MarketDetailModal
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
        />
      )}
    </div>
  );
}

function MarketCard({ market, onClick, isSelected }: {
  market: MarketMetrics;
  onClick: () => void;
  isSelected: boolean;
}) {
  const scoreColor = market.score >= 85 ? "text-emerald-400" : market.score >= 70 ? "text-amber-400" : "text-white/60";
  const scoreBg = market.score >= 85 ? "bg-emerald-500/10 border-emerald-400/30" : market.score >= 70 ? "bg-amber-500/10 border-amber-400/30" : "bg-white/5 border-white/10";

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border bg-white/5 p-4 text-left transition-all hover:bg-white/8 ${
        isSelected ? "border-emerald-400/50 bg-white/10" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-base mb-1">{market.market}</h3>
          <p className="text-xs text-white/60">{market.propertyCount} verified properties</p>
        </div>
        <div className={`rounded-lg border px-3 py-1.5 ${scoreBg}`}>
          <div className={`text-xl font-bold ${scoreColor}`}>{market.score}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 border border-white/10 p-2">
          <div className="text-[10px] text-white/60 mb-0.5">Spread</div>
          <div className="text-sm font-bold text-emerald-300">${market.spread}</div>
          <div className="text-[10px] text-white/50">+{market.spreadPercent}%</div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 p-2">
          <div className="text-[10px] text-white/60 mb-0.5">Avg CoC</div>
          <div className="text-sm font-bold text-white">{market.avgCoc}%</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <TrendingUp size={10} /> {market.trend}
          </div>
        </div>
      </div>
    </button>
  );
}

function MarketDetailModal({ market, onClose }: {
  market: MarketMetrics;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0b141d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{market.market}</h2>
              <p className="text-sm text-white/60">{market.propertyCount} active arbitrage opportunities</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10">
              <span className="text-white/60">✕</span>
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60 mb-2">Opportunity Score</div>
              <div className="text-3xl font-bold text-emerald-400">{market.score}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60 mb-2">Avg Spread</div>
              <div className="text-3xl font-bold text-white">${market.spread}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60 mb-2">Avg CoC</div>
              <div className="text-3xl font-bold text-white">{market.avgCoc}%</div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-sm text-white/70">Avg LTR Rent</span>
              <span className="text-sm font-semibold text-white">${market.avgRent}/mo</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-sm text-white/70">Avg STR Rate</span>
              <span className="text-sm font-semibold text-white">${market.avgStrRate}/night</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-sm text-white/70">Risk Score</span>
              <span className={`text-sm font-semibold ${market.riskScore < 30 ? "text-emerald-400" : "text-amber-400"}`}>
                {market.riskScore}/100
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Link
            href={`/properties?market=${market.city}`}
            className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            View Properties in {market.city}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}