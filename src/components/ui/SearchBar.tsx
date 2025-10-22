"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";

interface SearchBarProps {
  onLocationSearch?: (center: { lat: number; lng: number }) => void;
}

export default function SearchBar({ onLocationSearch }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams?.get("q");
  const min = searchParams?.get("min");
  const max = searchParams?.get("max");
  const type = searchParams?.get("type");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    const query = formData.get("q") as string;
    const minRent = formData.get("min") as string;
    const maxRent = formData.get("max") as string;
    const propertyType = formData.get("type") as string;

    if (query) params.set("q", query);
    if (minRent) params.set("min", minRent);
    if (maxRent) params.set("max", maxRent);
    if (propertyType && propertyType !== "All") params.set("type", propertyType);

    // If there's a location query, try to geocode it
    if (query && onLocationSearch) {
      try {
        const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.center) {
          onLocationSearch(data.center);
        }
      } catch (error) {
        console.error('Geocoding failed:', error);
      }
    }

    router.push(`/properties?${params.toString()}`);
  }

  return (
    <form 
      onSubmit={onSubmit} 
      className="grid gap-2 items-center p-4 bg-[--panel] rounded-xl border border-[--border]"
      style={{ gridTemplateColumns: "1.5fr 120px 120px 160px auto", columnGap: 8 }}
    >
      {/* Location */}
      <input 
        name="q" 
        placeholder="City, neighborhood, ZIP, address…" 
        defaultValue={q ?? ""} 
        className="px-3 py-2 bg-[--panel-2] border border-[--border] rounded-lg text-[--text] placeholder-[--muted]"
      />

      {/* Min Rent */}
      <input 
        name="min" 
        placeholder="Min" 
        type="number" 
        min={0} 
        defaultValue={min ?? ""}
        className="px-3 py-2 bg-[--panel-2] border border-[--border] rounded-lg text-[--text] placeholder-[--muted]"
      />

      {/* Max Rent */}
      <input 
        name="max" 
        placeholder="Max" 
        type="number" 
        min={0} 
        defaultValue={max ?? ""}
        className="px-3 py-2 bg-[--panel-2] border border-[--border] rounded-lg text-[--text] placeholder-[--muted]"
      />

      {/* Property Type */}
      <select 
        name="type" 
        defaultValue={type ?? "All"} 
        title="Home Type"
        className="px-3 py-2 bg-[--panel-2] border border-[--border] rounded-lg text-[--text]"
      >
        <option value="All">All homes</option>
        <option value="Apartment">Apartment</option>
        <option value="House">House</option>
        <option value="Townhome">Townhome</option>
        <option value="Condo">Condo</option>
        <option value="Duplex">Duplex</option>
      </select>

      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}