// src/components/SearchBar.tsx
"use client";
import { useState } from "react";

export type SearchValues = {
  q?: string; city?: string; state?: string; type?: string;
  minRent?: number | null; maxRent?: number | null; approval?: string;
};

export default function SearchBar({ initial = {}, onSearch }:{
  initial?: Partial<SearchValues>;
  onSearch: (v: SearchValues)=>void;
}) {
  const [tab, setTab] = useState<"quick"|"advanced">("quick");
  const [q, setQ] = useState(initial.q || "");
  const [city, setCity] = useState(initial.city || "");
  const [state, setState] = useState(initial.state || "");
  const [type, setType] = useState(initial.type || "");
  const [approval, setApproval] = useState(initial.approval || "");
  const [minRent, setMinRent] = useState<number | null>(null);
  const [maxRent, setMaxRent] = useState<number | null>(null);

  function apply() {
    onSearch({ q, city, state, type, approval, minRent, maxRent });
  }

  return (
    <div className="search">
      <div className="search-tabs">
        <button className={`tab ${tab==="quick"?"active":""}`} onClick={()=>setTab("quick")}>🔎 Quick Search</button>
        <button className={`tab ${tab==="advanced"?"active":""}`} onClick={()=>setTab("advanced")}>🧭 Advanced Filters</button>
      </div>

      {tab==="quick" ? (
        <>
          <div className="search-grid" data-pane="quick">
            <input placeholder="Address, city, state, or ZIP…" value={q} onChange={e=>setQ(e.target.value)} />
            <div style={{display:"flex",gap:10}}>
              <input type="number" placeholder="Min Rent" onChange={e=>setMinRent(e.target.value?Number(e.target.value):null)} />
              <input type="number" placeholder="Max Rent" onChange={e=>setMaxRent(e.target.value?Number(e.target.value):null)} />
            </div>
            <select value={type} onChange={e=>setType(e.target.value)}>
              <option value="">Property Type</option><option>Apartment</option><option>House</option><option>Townhome</option>
            </select>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginTop:12}}>
            <button className="btn primary" onClick={apply}>Search Properties →</button>
          </div>
        </>
      ) : (
        <>
          <div className="search-grid advanced" data-pane="advanced">
            <select value={approval} onChange={e=>setApproval(e.target.value)}>
              <option value="">Approval</option><option>STR</option><option>MTR</option><option>Yes</option><option>Pending</option>
            </select>
            <input placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
            <input placeholder="State" value={state} onChange={e=>setState(e.target.value)} />
          </div>
          <div style={{display:"flex",justifyContent:"center",marginTop:12}}>
            <button className="btn primary" onClick={apply}>Apply Filters</button>
          </div>
        </>
      )}
      <div className="fine" style={{marginTop:6,color:"var(--muted)"}}>
        Tip: combine Address/City/State + Approval for faster targeting.
      </div>
    </div>
  );
}
