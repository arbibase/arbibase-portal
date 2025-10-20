"use client";
import { useEffect, useMemo, useState } from "react";
import SearchBar, { SearchState } from "@/components/ui/SearchBar";
import PropertyCard, { Property } from "@/components/ui/PropertyCard";
import MapPane from "@/components/ui/MapPane";

const DEMO: Property[] = [
  {id:"1", city:"Miami", state:"FL", rent:3800, beds:2, baths:2, approval:"STR"},
  {id:"2", city:"Austin", state:"TX", rent:2200, beds:1, baths:1, approval:"Either"},
  {id:"3", city:"Nashville", state:"TN", rent:1900, beds:3, baths:2, approval:"MTR"},
];

export default function PropertiesPage(){
  const [s, setS] = useState<SearchState>({});
  const [mode, setMode] = useState<"gallery"|"map">("gallery");
  const list = useMemo(()=>{
    return DEMO.filter(p=>{
      const q = s.q?.toLowerCase().trim();
      if (q && !(`${p.city} ${p.state}`.toLowerCase().includes(q))) return false;
      if (s.type && s.type !== "") {/* add type when real data has it */}
      if (s.approval && s.approval !== "Either" && s.approval !== p.approval) return false;
      if (s.min && p.rent < s.min) return false;
      if (s.max && p.rent > s.max) return false;
      return true;
    });
  },[s]);

  useEffect(()=>{ /* TODO: fetch from /api/properties with s as query */ },[s]);

  return (
    <main className="container" style={{display:"grid",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0}}>Browse Properties</h2>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={()=>setMode("gallery")} aria-pressed={mode==="gallery"}>Gallery</button>
          <button className="btn" onClick={()=>setMode("map")} aria-pressed={mode==="map"}>Map / Gallery</button>
        </div>
      </div>

      <SearchBar value={s} onChange={setS} />

      {mode==="gallery" ? (
        <section className="grid" style={{gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {list.map(p => <PropertyCard key={p.id} p={p}/>)}
          {list.length===0 && <div className="fine">No results.</div>}
        </section>
      ) : (
        <section style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:16}}>
          <div className="grid" style={{gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
            {list.map(p => <PropertyCard key={p.id} p={p}/>)}
          </div>
          <MapPane />
        </section>
      )}
    </main>
  );
}
