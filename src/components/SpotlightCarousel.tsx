"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SpotlightCarousel({ items: initialItems }: { items?: any[] }) {
  const [items, setItems] = useState<any[] | null>(initialItems ?? null);
  const [loading, setLoading] = useState<boolean>(!initialItems || initialItems.length === 0);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function loadSpotlight() {
      if (initialItems && initialItems.length > 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error: fetchError } = await supabase
          .from("properties")
          .select("id,address,city,state,rent,image_url,is_spotlight")
          .eq("is_spotlight", true)
          .limit(5);

        if (fetchError) {
          console.error("Spotlight fetch error:", fetchError);
          throw fetchError;
        }

        if (mounted.current) setItems(data || []);
      } catch (e: any) {
        console.error("Error loading spotlight:", e);
        if (mounted.current) setError(e?.message || "Failed to load spotlight");
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    loadSpotlight();
    return () => { mounted.current = false; };
  }, [initialItems]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">Loading spotlight…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-6">
        <div className="text-sm text-red-300">Unable to load spotlight: {error}</div>
      </div>
    );
  }

  const renderItems = items ?? [];

  if (renderItems.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">No spotlight properties available</div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {renderItems.map((p: any) => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          {p.image_url && <img src={p.image_url} alt={p.address || "property"} className="w-full h-40 object-cover rounded-md mb-3" />}
          <div className="text-sm font-semibold text-white">{p.address || "Untitled"}</div>
          <div className="text-xs text-white/60">{p.city}, {p.state}</div>
          <div className="mt-2 text-sm font-bold text-emerald-400">${p.rent}</div>
        </div>
      ))}
    </div>
  );
}
