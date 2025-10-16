"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PropertyCard, { type Property } from "../../../components/PropertyCard";
import SearchBar from "@/components/SearchBar";
import { useTier } from "@/lib/useTier";

export function PropertiesPage() {
  const { tier, loading } = useTier();

  if (loading) return <p>Loading...</p>;

  return (
    <main className="min-h-screen px-6 py-12">
      <SearchBar
        tier={tier === "beta" ? "basic" : "advanced"}
        onSearch={(filters) => console.log("filters", filters)}
      />
    </main>
  );
}

type SearchFilters = {
  q: string;
  city: string;
  state: string;
  type: string;
  approval: string;
};

export default function Properties() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Property[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    q: "",
    city: "",
    state: "",
    type: "",
    approval: "",
  });

  // auth gate
  useEffect(() => {
    (async () => {
      if (!supabase) return (location.href = "/login");
      const { data } = await supabase.auth.getUser();
      if (!data.user) return (location.href = "/login");
      setReady(true);
    })();
  }, []);

  async function load(signal?: AbortSignal) {
    if (!supabase) return;
    setLoading(true);
    try {
      const client = supabase;
      let query = client
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);

      if (filters.city) query = query.ilike("city", `%${filters.city}%`);
      if (filters.state) query = query.ilike("state", `%${filters.state}%`);
      if (filters.type) query = query.ilike("unit_type", `%${filters.type}%`);
      if (filters.approval) query = query.ilike("approval", `%${filters.approval}%`);
      if (filters.q)
        query = query.or(
          `address.ilike.%${filters.q}%,notes.ilike.%${filters.q}%,name.ilike.%${filters.q}%`
        );

      const { data } = await query;
      if (signal?.aborted) return;
      setRows((data || []) as Property[]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  

  // initial load
  useEffect(() => {
    if (!ready) return;
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [ready]);

  // debounced reload on filter change
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [filters, ready]);

  const countText = useMemo(
    () => (loading ? "Loading…" : `${rows.length} result${rows.length === 1 ? "" : "s"}`),
    [rows.length, loading]
  );

  return (
    <main className="dashboard">
      <section aria-labelledby="properties-title" className="container" style={{ paddingTop: 24 }}>
        <header style={{ marginBottom: 12 }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {countText}
          </p>
          <h1 id="properties-title" className="text-2xl font-extrabold">
            Property Browser
          </h1>
          <p className="lead" style={{ marginTop: 6 }}>
            Explore operator-friendly properties. Use filters to narrow by city, type, and approval.
          </p>
        </header>

        {/* Search / filters (your shared component, wrapped in themed container) */}
        <div className="search">
          <SearchBar
            tier="basic"
            initial={filters}
            onSearch={(v) => setFilters(v as unknown as SearchFilters)}
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="card-body">
                  <div
                    style={{
                      height: 150,
                      background: "var(--panel-2)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                    }}
                  />
                  <div className="hr" />
                  <div
                    style={{
                      height: 14,
                      background: "var(--panel-2)",
                      borderRadius: 6,
                      margin: "8px 0",
                    }}
                  />
                  <div
                    style={{
                      height: 12,
                      width: "70%",
                      background: "var(--panel-2)",
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card mt-6">
            <div className="card-body" style={{ padding: 20 }}>
              <h2 style={{ margin: 0 }}>No properties found</h2>
              <p className="mt-1" style={{ color: "var(--muted)" }}>
                Try clearing filters or searching a broader term.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {rows.map((property) => (
              <PropertyCard key={property.id} p={property} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
