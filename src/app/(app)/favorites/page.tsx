"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  Heart, Search, Filter, MapPin, Bed, Bath, DollarSign,
  Star, Trash2, ExternalLink, Calendar, Building2, Sparkles
} from "lucide-react";

type FavoriteProperty = {
  id: string;
  property_id: string;
  saved_at: string;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    rent: number;
    beds: number;
    baths: number;
    property_type?: string;
    photo_url?: string;
    verified: boolean;
    summary?: string;
  };
};

export default function FavoritesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteProperty[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price-low" | "price-high">("recent");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

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
    fetchFavorites();
  }

  async function fetchFavorites() {
    if (!supabase) return;

    try {
      // Fetch user's favorites with property details
      const { data: favoritesData, error } = await supabase
        .from("favorites")
        .select(`
          id,
          property_id,
          created_at,
          properties (
            id,
            name,
            address,
            city,
            state,
            rent,
            beds,
            baths,
            property_type,
            photo_url,
            verified,
            summary
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching favorites:", error);
        setFavorites(getMockFavorites());
        return;
      }

      if (favoritesData && favoritesData.length > 0) {
        const mapped: FavoriteProperty[] = favoritesData
          .filter(f => f.properties) // Only include favorites with valid property data
          .map(f => {
            const prop = Array.isArray(f.properties) ? f.properties[0] : f.properties;
            return {
              id: f.id,
              property_id: f.property_id,
              saved_at: f.created_at,
              property: {
                id: prop.id,
                name: prop.name || "Untitled Property",
                address: prop.address || "",
                city: prop.city || "",
                state: prop.state || "",
                rent: prop.rent || 0,
                beds: prop.beds || 0,
                baths: prop.baths || 0,
                property_type: prop.property_type,
                photo_url: prop.photo_url,
                verified: prop.verified || false,
                summary: prop.summary
              }
            };
          });
        setFavorites(mapped);
        setFilteredFavorites(mapped);
      } else {
        // No favorites yet
        setFavorites([]);
        setFilteredFavorites([]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setFavorites(getMockFavorites());
    }
  }

  async function handleRemoveFavorite(favoriteId: string) {
    setRemovingId(favoriteId);
    
    try {
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;
      
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      setFilteredFavorites(prev => prev.filter(f => f.id !== favoriteId));
    } catch (error) {
      console.error("Error removing favorite:", error);
      alert("Failed to remove favorite. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  function getMockFavorites(): FavoriteProperty[] {
    return [
      {
        id: "fav-1",
        property_id: "prop-1",
        saved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        property: {
          id: "prop-1",
          name: "Downtown Luxury Loft",
          address: "123 Main St #301",
          city: "Austin",
          state: "TX",
          rent: 2500,
          beds: 2,
          baths: 2,
          property_type: "apartment",
          photo_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
          verified: true,
          summary: "Modern loft with high ceilings and skyline views."
        }
      }
    ];
  }

  // Filter & Sort logic
  useEffect(() => {
    let filtered = [...favorites];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(fav =>
        fav.property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.property.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "recent") {
      filtered.sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
    } else if (sortBy === "price-low") {
      filtered.sort((a, b) => a.property.rent - b.property.rent);
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.property.rent - a.property.rent);
    }

    setFilteredFavorites(filtered);
  }, [searchQuery, sortBy, favorites]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading favorites...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Favorites</span>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl">
              Saved Properties
            </h1>
            <p className="mt-1 text-white/60">
              {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved for quick access
            </p>
          </div>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,.3)] hover:bg-emerald-600"
          >
            <Sparkles size={16} /> Browse More
          </Link>
        </div>
      </header>

      {/* Stats & Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search saved properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-white/60" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="input min-w-40"
          >
            <option value="recent">Recently Saved</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredFavorites.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery.trim()} totalCount={favorites.length} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFavorites.map((favorite) => (
            <PropertyCard
              key={favorite.id}
              favorite={favorite}
              onRemove={() => handleRemoveFavorite(favorite.id)}
              isRemoving={removingId === favorite.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyCard({ favorite, onRemove, isRemoving }: {
  favorite: FavoriteProperty;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const { property } = favorite;
  const savedDaysAgo = Math.floor((Date.now() - new Date(favorite.saved_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <article className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all hover:bg-white/8 hover:border-emerald-400/30">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-linear-to-br from-sky-800/40 to-emerald-800/40">
        {property.photo_url ? (
          <Image
            src={property.photo_url}
            alt={property.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 size={48} className="text-white/20" />
          </div>
        )}
        
        {/* Verified Badge */}
        {property.verified && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            <Star size={12} fill="currentColor" />
            Verified
          </div>
        )}

        {/* Remove Button */}
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="absolute top-3 right-3 rounded-full bg-red-500/20 backdrop-blur-sm p-2 text-red-300 transition-all hover:bg-red-500/30 disabled:opacity-50"
          title="Remove from favorites"
        >
          {isRemoving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
          ) : (
            <Heart size={16} fill="currentColor" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{property.name}</h3>
        
        <div className="flex items-center gap-1.5 text-sm text-white/60 mb-3">
          <MapPin size={14} />
          <span className="line-clamp-1">{property.address}, {property.city}, {property.state}</span>
        </div>

        {property.summary && (
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
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Calendar size={12} />
            <span>Saved {savedDaysAgo === 0 ? 'today' : `${savedDaysAgo}d ago`}</span>
          </div>
          
          <Link
            href={`/properties/${property.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/90 transition-all hover:bg-white/10 hover:border-emerald-400/30"
          >
            View <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ hasSearch, totalCount }: { hasSearch: boolean; totalCount: number }) {
  if (hasSearch) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
        <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <Search size={32} className="text-white/40" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">No matches found</h3>
        <p className="text-white/60">Try adjusting your search query</p>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
        <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Heart size={32} className="text-emerald-400" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">No favorites yet</h3>
        <p className="mb-6 text-white/60">
          Start saving properties you're interested in for quick access later
        </p>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <Sparkles size={16} /> Browse Properties
        </Link>
      </div>
    );
  }

  return null;
}
