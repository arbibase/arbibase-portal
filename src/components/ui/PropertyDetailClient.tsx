"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";

interface Property {
  id: string | number;
  title: string;
  address: string;
  rent: number;
  beds: number;
  baths: number;
  approval: string;
  photos?: string[];
  lat: number;
  lng: number;
  description?: string;
  amenities?: string[];
}

const MapPane = dynamic(() => import("@/components/ui/MapPane"), { ssr: false }) as any;

export default function PropertyDetailClient({ p }: { p: Property }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const hero = p.photos?.[heroIdx] ?? p.photos?.[0];

  return (
    <main className="container grid gap-6 py-4">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">{p.title}</h1>
        <p className="text-gray-300">{p.address}</p>
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold text-white">${p.rent.toLocaleString()}</span>
          <span className="text-gray-400">/month</span>
          <span className="text-gray-400">• {p.beds} bd • {p.baths} ba</span>
          <span className="rounded-full border border-[#203142] bg-[#0f1824] px-2 py-0.5 text-xs font-extrabold text-[#bdeaff]">
            {p.approval}
          </span>
        </div>
      </header>

      {/* Gallery */}
      <section className="grid grid-cols-5 gap-3 rounded-2xl overflow-hidden">
        {/* hero */}
        <div className="relative col-span-5 md:col-span-3 h-[360px] bg-[#0f141c]">
          {hero && <Image src={hero} alt={`${p.title} photo`} fill className="object-cover" />}
        </div>
        {/* thumbs */}
        <div className="col-span-5 md:col-span-2 grid grid-cols-2 gap-3">
          {(p.photos ?? []).map((src, i) => (
            <button
              key={src}
              onClick={() => setHeroIdx(i)}
              className={`relative h-[174px] bg-[#0f141c] rounded overflow-hidden ring-offset-2 ${
                i === heroIdx ? "ring-2 ring-sky-400" : ""
              }`}
            >
              <Image src={src} alt={`${p.title} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
          {(!p.photos || p.photos.length === 0) && (
            <div className="text-sm text-gray-400">No images</div>
          )}
        </div>
      </section>

      {/* Split: Facts + Map */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Facts / Description */}
        <div className="lg:col-span-2 grid gap-4">
          {(p as any).description && (
            <div className="rounded-xl border border-[#1e2733] bg-[#0d131a] p-4">
              <h2 className="text-lg font-semibold mb-2">About this property</h2>
              <p className="text-gray-300 leading-relaxed">{(p as any).description}</p>
            </div>
          )}
          <div className="rounded-xl border border-[#1e2733] bg-[#0d131a] p-4">
            <h2 className="text-lg font-semibold mb-3">Facts & features</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-gray-300">
              <div>Bedrooms: <strong>{p.beds}</strong></div>
              <div>Bathrooms: <strong>{p.baths}</strong></div>
              <div>Approval: <strong>{p.approval}</strong></div>
              <div>Address: <strong className="text-gray-200">{p.address}</strong></div>
            </div>
            {(p as any).amenities?.length > 0 && (
              <>
                <hr className="my-3 border-[#1e2733]" />
                <h3 className="font-semibold mb-2">Amenities</h3>
                <ul className="grid sm:grid-cols-2 gap-1.5 text-gray-300 list-disc list-inside">
                  {(p as any).amenities.map((a: string) => <li key={a}>{a}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="h-[340px] overflow-hidden rounded-lg">
            <MapPane
              initialCenter={{ lat: p.lat, lng: p.lng }}
              initialZoom={14}
              markers={[{ id: p.id, title: p.title, position: { lat: p.lat, lng: p.lng } }]}
            />
          </div>
          <p className="mt-2 text-sm text-gray-400">{p.address}</p>
        </aside>
      </section>
    </main>
  );
}
