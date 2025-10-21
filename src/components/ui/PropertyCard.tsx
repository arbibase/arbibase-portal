// src/components/ui/PropertyCard.tsx
import Link from "next/link";

export interface P {
  id: string | number;
  approval: string;
  type: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  rent: number;
  beds: number;
  baths: number;
  sqft?: number;
}

export default function PropertyCard({ p }: { p: P }) {
  return (
    <Link
      href={`/properties/${p.id}`}
      className="block rounded-xl border border-[#1e2733] bg-[#0b121a] p-3 hover:border-[#2a7fff] transition"
    >
      <div className="text-sm text-[#66e] mb-1">{p.approval} • {p.type}</div>
      <div className="text-white font-semibold">{p.title}</div>
      <div className="text-gray-300 text-sm">
        {p.address}, {p.city}, {p.state} {p.zip}
      </div>
      <div className="mt-2 text-gray-200">
        <span className="font-semibold">${p.rent.toLocaleString()}</span>{" "}
        • {p.beds} bd • {p.baths} ba{p.sqft ? ` • ${p.sqft} sqft` : ""}
      </div>
      <div className="mt-2 text-sm text-[#6aa9ff]">View details →</div>
    </Link>
  );
}
