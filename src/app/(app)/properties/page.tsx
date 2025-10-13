"use client";
import { useEffect, useState } from "react";
import { supabase } from '../../../lib/supabase'
import type { User } from '@supabase/supabase-js';
import clsx from "clsx";

type Property = {
  id: string;
  image_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  unit_type: string | null;
  rent: number | null;
  approval: string | null;
  verification_status: string | null;
};

export default function Properties() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Property[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState("");
  const [approval, setApproval] = useState("");
  useEffect(() => {
    if (!supabase) {
      // If supabase client is not available, redirect to login as a fallback
      location.href = "/login";
      return;
    }
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } | null }) => {
      if (!data?.user) location.href = "/login";
      else setReady(true);
    });
  }, []);

  async function load() {
    if (!supabase) {
      // Supabase client is not available — redirect to login as a fallback and avoid runtime errors
      location.href = "/login";
      return;
    }
    let query = supabase.from("properties").select("*").order("created_at", { ascending: false }).limit(60);
    if (city) query = query.ilike("city", `%${city}%`);
    if (state) query = query.ilike("state", `%${state}%`);
    if (type) query = query.ilike("unit_type", `%${type}%`);
    if (approval) query = query.ilike("approval", `%${approval}%`);
    if (q) query = query.or(`address.ilike.%${q}%,notes.ilike.%${q}%`);
    const { data } = await query;
    if (data) setRows(data as Property[]);
  }

  useEffect(() => { if (ready) load(); }, [ready]);

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-extrabold">Properties</h1>

      <div className="card p-4 mt-4">
        <div className="grid md:grid-cols-5 gap-3">
          <input className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                 placeholder="Search address or notes" value={q} onChange={e=>setQ(e.target.value)} />
          <input className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                 placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
          <input className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                 placeholder="State" value={state} onChange={e=>setState(e.target.value)} />
          <input className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                 placeholder="Type (Apartment, House…)" value={type} onChange={e=>setType(e.target.value)} />
          <select className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                  value={approval} onChange={e=>setApproval(e.target.value)}>
            <option value="">Approval</option>
            <option>STR</option>
            <option>MTR</option>
            <option>Yes</option>
            <option>Pending</option>
          </select>
        </div>
        <button className="btn btn-primary mt-3" onClick={load}>Apply Filters</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {rows.map(p => (
          <article key={p.id} className="card overflow-hidden">
            <div className="relative">
              <img src={p.image_url || "https://via.placeholder.com/640x360?text=No+Image"}
                   alt={p.address ?? "Property"} className="w-full h-44 object-cover" />
              <span className={clsx(
                "absolute top-2 right-2 px-2 py-1 text-xs rounded-full",
                (p.verification_status || "lead").toLowerCase()==="verified" ? "bg-green-500 text-black" : "bg-sky-500 text-black"
              )}>
                {p.verification_status || "Lead"}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold">{p.address}</h3>
              <p className="text-sm" style={{color:"#9aa5b1"}}>{p.city}, {p.state} • {p.unit_type || "Type"}</p>
              <p className="mt-1"><strong>${p.rent ?? "—"}</strong> / mo • {p.approval || "Approval"}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn">👁 View</button>
                <button className="btn">☆ Save</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
