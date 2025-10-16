"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";
import SearchBar, { type SearchValues } from "@/components/SearchBar";
import PropertyCard, { type Property } from "@/components/PropertyCard";

export default function Properties() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Property[]>([]);

  useEffect(() => {
    if (!supabase) { location.href = "/login"; return; }
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } | null }) => {
      if (!data?.user) location.href = "/login"; else setReady(true);
    });
  }, []);

  async function load(filters?: SearchValues) {
    if (!supabase) { location.href = "/login"; return; }
    let q = supabase.from("properties").select("*").order("created_at", { ascending: false }).limit(60);

    if (filters?.city) q = q.ilike("city", `%${filters.city}%`);
    if (filters?.state) q = q.ilike("state", `%${filters.state}%`);
    if (filters?.type) q = q.ilike("unit_type", `%${filters.type}%`);
    if (filters?.approval) q = q.ilike("approval", `%${filters.approval}%`);
    if (filters?.q) q = q.or(`address.ilike.%${filters.q}%,notes.ilike.%${filters.q}%`);
    if (filters?.minRent != null) q = q.gte("rent", filters.minRent);
    if (filters?.maxRent != null) q = q.lte("rent", filters.maxRent);

    const { data } = await q;
    if (data) setRows(data as Property[]);
  }

  useEffect(() => { if (ready) load(); }, [ready]);

  return (
    <div>
      <section>
        <h1 className="text-3xl font-extrabold" style={{ marginBottom: 10 }}>Find Properties</h1>
        <p className="fine" style={{ marginBottom: 18, color: "var(--muted)" }}>
          Search verified & lead properties with quick or advanced filters.
        </p>
        <SearchBar onSearch={load} />
      </section>

      <section aria-label="Search Results" style={{ paddingTop: 24 }}>
        <div className="cards" style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          {rows.map((p) => <PropertyCard key={p.id} p={p} />)}
          {!rows.length && (
            <div className="fine" style={{ color: "var(--muted)" }}>
              No properties match your filters yet. Try widening your search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
