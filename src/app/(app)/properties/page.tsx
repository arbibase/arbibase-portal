"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  Search, Filter, MapPin, Bed, Bath, DollarSign, Heart,
  Building2, Grid, Map as MapIcon, CheckCircle2,
  SlidersHorizontal, X
} from "lucide-react";

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  rent: number;
  beds: number;
  baths: number;
  property_type?: string;
  photo_url?: string;
  verified: boolean;
  summary?: string;
  lat?: number;
  lng?: number;
  favorite?: boolean;
};

export default function PropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [beds, setBeds] = useState("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [router]);

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
    fetchProperties();
  }

  async function fetchProperties() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
        setProperties(getMockProperties());
        setFilteredProperties(getMockProperties());
        return;
      }

      if (data && data.length > 0) {
        setProperties(data as Property[]);
        setFilteredProperties(data as Property[]);
      } else {
        setProperties(getMockProperties());
        setFilteredProperties(getMockProperties());
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setProperties(getMockProperties());
      setFilteredProperties(getMockProperties());
    }
  }

  function getMockProperties(): Property[] {
    return [];  // Return empty array - no mock data
  }

  // Filter logic
  useEffect(() => {
    let filtered = [...properties];

    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (minRent) {
      filtered = filtered.filter(p => p.rent >= parseInt(minRent));
    }

    if (maxRent) {
      filtered = filtered.filter(p => p.rent <= parseInt(maxRent));
    }

    if (beds !== "any") {
      filtered = filtered.filter(p => p.beds >= parseInt(beds));
    }

    if (verifiedOnly) {
      filtered = filtered.filter(p => p.verified);
    }

    setFilteredProperties(filtered);
  }, [searchQuery, minRent, maxRent, beds, verifiedOnly, properties]);

  async function toggleFavorite(propertyId: string) {
    console.log("Toggle favorite:", propertyId);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading properties...</p>
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
          <span className="text-white/90">Properties</span>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl">
              Property Browser
            </h1>
            <p className="mt-1 text-white/60">
              {filteredProperties.length} verified properties available
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-emerald-500 text-white"
                  : "border border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
              }`}
            >
              <Grid size={16} className="inline mr-2" /> Grid
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "map"
                  ? "bg-emerald-500 text-white"
                  : "border border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
              }`}
            >
              <MapIcon size={16} className="inline mr-2" /> Map
            </button>
          </div>
        </div>
      </header>

      {/* Search & Filters Bar - FIXED OVERLAP */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search by name, address, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <SlidersHorizontal size={16} />
            Filters {showFilters && <X size={14} />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/70">Min Rent</label>
              <input
                type="number"
                placeholder="$1,000"
                value={minRent}
                onChange={(e) => setMinRent(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-white/70">Max Rent</label>
              <input
                type="number"
                placeholder="$5,000"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-white/70">Bedrooms</label>
              <select 
                value={beds} 
                onChange={(e) => setBeds(e.target.value)} 
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="any" className="bg-[#0b141d]">Any</option>
                <option value="1" className="bg-[#0b141d]">1+</option>
                <option value="2" className="bg-[#0b141d]">2+</option>
                <option value="3" className="bg-[#0b141d]">3+</option>
                <option value="4" className="bg-[#0b141d]">4+</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500"
                />
                <span className="text-sm text-white/90">Verified Only</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Content Area - FIXED MAP LAYOUT */}
      {viewMode === "grid" ? (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} onToggleFavorite={toggleFavorite} />
          ))}
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Map - Left side, takes up more space */}
          <div className="h-[600px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <div className="text-center text-white/40">
              <MapIcon size={48} className="mx-auto mb-2" />
              <p className="text-sm">Map integration coming soon</p>
              <p className="text-xs">Google Maps API key required</p>
            </div>
          </div>

          {/* Property List - Right side */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onToggleFavorite={toggleFavorite}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {filteredProperties.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-white/20" />
          <h3 className="mb-2 text-xl font-bold text-white">No properties found</h3>
          <p className="text-white/60">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property, onToggleFavorite, compact = false }: {
  property: Property;
  onToggleFavorite: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all hover:bg-white/8 hover:border-emerald-400/30">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-sky-800/40 to-emerald-800/40">
        {property.photo_url ? (
          <img
            src={property.photo_url}
            alt={property.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 size={48} className="text-white/20" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {property.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle2 size={12} /> Verified
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => onToggleFavorite(property.id)}
          className="absolute top-3 right-3 rounded-full bg-white/10 backdrop-blur-sm p-2 text-white transition-all hover:bg-white/20"
        >
          <Heart size={16} fill={property.favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{property.name}</h3>
        
        <div className="flex items-center gap-1.5 text-sm text-white/60 mb-3">
          <MapPin size={14} />
          <span className="line-clamp-1">{property.city}, {property.state}</span>
        </div>

        {property.summary && !compact && (
          <p className="text-sm text-white/70 line-clamp-2 mb-4">{property.summary}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-white/70">
          <div className="flex items-center gap-1">
            <Bed size={14} />
            <span>{property.beds} bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={14} />
            <span>{property.baths} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign size={14} />
            <span>${property.rent.toLocaleString()}/mo</span>
          </div>
        </div>

        {/* Footer */}
        <Link
          href={`/properties/${property.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}