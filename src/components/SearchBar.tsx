// src/components/SearchBar.tsx
"use client";
import { useState } from "react";

type Props = {
  initial: { q: string; city: string; state: string; type: string; approval: string };
  onSearch: (v: Props["initial"]) => void;
};

export default function SearchBar({ initial, onSearch }: Props) {
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v, val: string) => setV(prev => ({ ...prev, [k]: val }));

  return (
    <div className="search">
      <div className="search-grid">
        <input placeholder="Search address or notes" value={v.q} onChange={e=>set("q", e.target.value)} />
        <input placeholder="City" value={v.city} onChange={e=>set("city", e.target.value)} />
        <input placeholder="State" value={v.state} onChange={e=>set("state", e.target.value)} />
        <input placeholder="Type (Apartment, House…)" value={v.type} onChange={e=>set("type", e.target.value)} />
        <select value={v.approval} onChange={e=>set("approval", e.target.value)}>
          <option value="">Approval</option>
          <option>STR</option>
          <option>MTR</option>
          <option>Yes</option>
          <option>Pending</option>
        </select>
      </div>
      <div className="actions">
        <button className="btn primary" onClick={() => onSearch(v)}>Apply Filters</button>
      </div>
    </div>
  );
}
