"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = { isPro?: boolean };

export default function SearchBar({ isPro = false }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params?.get("q") ?? "");
  const [min, setMin] = useState(params?.get("min") ?? "");
  const [max, setMax] = useState(params?.get("max") ?? "");
  const [type, setType] = useState(params?.get("type") ?? "");

  // Pro extras (just wired in URL for now)
  const [beds, setBeds] = useState(params?.get("beds") ?? "");
  const [baths, setBaths] = useState(params?.get("baths") ?? "");
  const [approval, setApproval] = useState(params?.get("approval") ?? "");

  const apply = useCallback(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (min) sp.set("min", min);
    if (max) sp.set("max", max);
    if (type) sp.set("type", type);
    if (isPro && beds) sp.set("beds", beds);
    if (isPro && baths) sp.set("baths", baths);
    if (isPro && approval) sp.set("approval", approval);
    router.push(`/properties?${sp.toString()}`);
  }, [q, min, max, type, isPro, beds, baths, approval, router]);

  return (
    <div className="rounded-2xl border border-[#1e2733] bg-[#0b121a] p-3">
      <div className="flex flex-wrap gap-8 items-center">
        <div className="flex-1 min-w-[260px]">
          <label className="fine block mb-1">Location</label>
          <input
            className="input w-full"
            placeholder="Address, neighborhood, city, ZIP"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=> e.key==="Enter" && apply()}
          />
        </div>

        <div>
          <label className="fine block mb-1">Price</label>
          <div className="flex gap-2">
            <input className="input w-[120px]" placeholder="Min" inputMode="numeric" value={min} onChange={e=>setMin(e.target.value)} />
            <input className="input w-[120px]" placeholder="Max" inputMode="numeric" value={max} onChange={e=>setMax(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="fine block mb-1">Home Type</label>
          <select className="input w-[180px]" value={type} onChange={e=>setType(e.target.value)}>
            <option value="">Any</option>
            <option>Apartment</option>
            <option>House</option>
            <option>Condo</option>
            <option>Townhome</option>
            <option>Duplex</option>
          </select>
        </div>

        {/* Pro / Premium */}
        {isPro && (
          <>
            <div>
              <label className="fine block mb-1">Beds (min)</label>
              <select className="input w-[120px]" value={beds} onChange={e=>setBeds(e.target.value)}>
                <option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option>
              </select>
            </div>
            <div>
              <label className="fine block mb-1">Baths (min)</label>
              <select className="input w-[120px]" value={baths} onChange={e=>setBaths(e.target.value)}>
                <option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option>
              </select>
            </div>
            <div>
              <label className="fine block mb-1">Approval</label>
              <select className="input w-[160px]" value={approval} onChange={e=>setApproval(e.target.value)}>
                <option value="">Any</option>
                <option value="STR">STR</option>
                <option value="MTR">MTR</option>
                <option value="Either">Either</option>
              </select>
            </div>
          </>
        )}

        <div className="ml-auto">
          <button className="btn primary" onClick={apply}>Search Properties →</button>
        </div>
      </div>
    </div>
  );
}
