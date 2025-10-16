"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PropertyCard, { type Property } from "../../../components/PropertyCard";
import SearchBar from "../../../components/SearchBar";

type SearchFilters = {
  q: string;
  city: string;
  state: string;
  type: string;
  approval: string;
};

export default function Properties() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Property[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    q: "",
    city: "",
    state: "",
    type: "",
    approval: "",
  });

  const handleFilterChange = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) location.href = "/login";
      else setReady(true);
    });
  }, []);

  async function load() {
    if (!supabase) return;
    const client = supabase;
    let query = client.from("properties").select("*").order("created_at", { ascending: false }).limit(60);
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.state) query = query.ilike("state", `%${filters.state}%`);
    if (filters.type) query = query.ilike("unit_type", `%${filters.type}%`);
    if (filters.approval) query = query.ilike("approval", `%${filters.approval}%`);
    if (filters.q) query = query.or(`address.ilike.%${filters.q}%,notes.ilike.%${filters.q}%`);
    const { data } = await query;
    if (data) setRows(data as Property[]);
  }

  useEffect(() => { if (ready) load(); }, [ready]);

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-extrabold">Properties</h1>

      <SearchBar initial={filters} onSearch={(v) => { setFilters(v as unknown as SearchFilters); load(); }} />

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {rows.map((property) => (
          <PropertyCard key={property.id} p={property} />
        ))}
      </div>
    </main>
  );
}