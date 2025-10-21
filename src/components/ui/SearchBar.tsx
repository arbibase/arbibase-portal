"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Tier = "basic" | "pro" | "premium";

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [tier] = useState<Tier>("basic"); // later: fetch from user profile
  const [q, setQ] = useState(() => params?.get("q") ?? "");
  const [min, setMin] = useState(() => params?.get("min") ?? "");
  const [max, setMax] = useState(() => params?.get("max") ?? "");
  const [homeType, setHomeType] = useState("All");
  const [beds, setBeds] = useState("Any");
  const [baths, setBaths] = useState("Any");
  const [approval, setApproval] = useState("Either");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (min) sp.set("min", min);
    if (max) sp.set("max", max);
    if (approval !== "Either") sp.set("approval", approval);
    router.push(`/properties?${sp.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="z-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:bg-[#0b121a]/90"
      style={{ margin: "8px 0", position: "sticky", top: 0 }}
    >
      {/* Location Search */}
      <input
        type="text"
        placeholder="City, neighborhood, ZIP, address…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-w-[240px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />

      {/* Price */}
      <input
        type="number"
        placeholder="Min"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-[100px] rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="number"
        placeholder="Max"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-[100px] rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />

      {/* Home Type */}
      <select
        value={homeType}
        onChange={(e) => setHomeType(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
      >
        <option>All</option>
        <option>House</option>
        <option>Apartment</option>
        <option>Condo</option>
        <option>Townhome</option>
      </select>

      {/* Tier-Locked Filters */}
      {(tier === "pro" || tier === "premium") && (
        <>
          <select
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
          >
            <option>Any Beds</option>
            <option>1+</option>
            <option>2+</option>
            <option>3+</option>
          </select>
          <select
            value={baths}
            onChange={(e) => setBaths(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
          >
            <option>Any Baths</option>
            <option>1+</option>
            <option>2+</option>
            <option>3+</option>
          </select>
          <select
            value={approval}
            onChange={(e) => setApproval(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
          >
            <option>Either</option>
            <option>STR</option>
            <option>MTR</option>
          </select>
        </>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
      >
        Search
      </button>

      {/* CTA */}
      {tier === "basic" && (
        <button
          type="button"
          onClick={() => alert("Upgrade to Pro to unlock advanced filters.")}
          className="rounded-lg border border-blue-500 px-4 py-2 text-blue-600 hover:bg-blue-50"
        >
          Unlock Advanced Filters — Go Pro
        </button>
      )}
    </form>
  );
}
