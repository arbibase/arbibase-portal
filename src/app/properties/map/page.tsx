"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Filter, Layers, List, Search, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const PropertyMap = dynamic(() => import("@/components/PropertyMap") as any, {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-white/5">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
        <p className="mt-4 text-sm text-white/70">Loading map...</p>
      </div>
    </div>
  ),
}) as any;

interface Property {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  price?: number;
  roi?: number;
  latitude?: number;
  longitude?: number;
  image_url?: string;
}

export default function MapViewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapView, setMapView] = useState<"street" | "satellite">("street");
  const [showFilters, setShowFilters] = useState(false);

  // --- NEW helper: detect missing supabase client-side config
  function isSupabaseConfiguredClientSide() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    if (!isSupabaseConfiguredClientSide()) {
      console.warn("Supabase client config missing (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). Map will load with no remote data.");
      // minimal fallback so map can still render
      setProperties([]);
      setLoading(false);
      return;
    }

    if (!supabase) {
      router.replace("/login");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.replace("/login");
      return;
    }
    try {
      await loadProperties();
    } catch (e) {
      console.warn("Loading properties failed, using empty list", e);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProperties() {
    if (!isSupabaseConfiguredClientSide() || !supabase) {
      setProperties([]);
      return;
    }

    try {
      const { data, error, status } = await supabase
        .from("properties")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(100);

      if (error) {
        if (status === 404) {
          console.warn("Supabase table 'properties' not found (404). Map will show no properties until backend is fixed.");
        } else {
          console.error("Error loading properties:", error);
        }
        setProperties([]);
        return;
      }

      if (Array.isArray(data)) {
        setProperties(data as any);
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error("Unexpected error loading properties:", err);
      setProperties([]);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f141c]">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-white/70">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f141c]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0b141d] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-white/70 hover:text-white text-sm"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">Property Map</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <Filter size={16} />
              Filters
            </button>
            <select
              value={mapView}
              onChange={(e) => setMapView(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="street">Street View</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Map Section */}
        <div className="flex-1 relative">
          <PropertyMap
            properties={properties}
            selectedProperty={selectedProperty}
            onPropertySelect={(p: any) => setSelectedProperty(p)}
            mapView={mapView}
          />

          {/* Map Controls */}
          <div className="absolute top-4 left-4 space-y-2">
            <button className="rounded-lg border border-white/10 bg-[#0b141d] p-3 text-white hover:bg-white/5">
              <Layers size={20} />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-[#0b141d]/95 backdrop-blur-sm p-4">
            <h4 className="text-sm font-semibold text-white mb-3">ROI Heat Map</h4>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <div className="w-4 h-4 rounded bg-amber-500"></div>
                <div className="w-4 h-4 rounded bg-emerald-500"></div>
              </div>
              <span className="text-xs text-white/60">Low → High</span>
            </div>
          </div>
        </div>

        {/* Property List Sidebar */}
        <div className="w-96 border-l border-white/10 bg-[#0b141d] overflow-y-auto">
          <div className="p-4">
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search properties..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pl-10 text-white text-sm placeholder:text-white/40"
              />
            </div>

            <div className="space-y-3">
              {properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedProperty?.id === property.id
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {property.image_url && (
                    <img
                      src={property.image_url}
                      alt={property.address}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h4 className="font-semibold text-white text-sm mb-1">
                    {property.address}
                  </h4>
                  <p className="text-xs text-white/60 mb-3">
                    {property.city}, {property.state}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      ${typeof property.price === "number" ? property.price.toLocaleString() : "N/A"}
                    </span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {property.roi}% ROI
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
