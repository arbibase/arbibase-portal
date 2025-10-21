"use client";

import Image from "next/image";

export type Property = {
  id: string;
  city: string;
  state: string;
  address: string;
  rent: number;
  beds: number;
  baths: number;
  approval: "STR" | "MTR" | "Either";
  photos?: string[];
};

export default function PropertyCard({ p }: { p: Property }) {
  return (
    <article
      className="rounded-xl overflow-hidden border border-[#1e2733] bg-[#0d131a] hover:border-[#1d4ed8] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative h-40 w-full bg-[#111820]">
        {p.photos?.[0] ? (
          <Image
            src={p.photos[0]}
            alt={`${p.city} property photo`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            No image
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 space-y-1.5">
        <h3 className="text-base font-semibold text-white">
          ${p.rent.toLocaleString()}{" "}
          <span className="text-sm text-gray-400">/month</span>
        </h3>

        <p className="text-sm text-gray-300 leading-tight">
          {p.beds} bed • {p.baths} bath
        </p>

        {/* ✅ Full Address Line */}
        <p className="text-sm text-gray-400 truncate">
          {p.address}
        </p>

        {/* Tag */}
        <span
          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
            p.approval === "STR"
              ? "bg-blue-900/30 text-blue-300"
              : p.approval === "MTR"
              ? "bg-green-900/30 text-green-300"
              : "bg-gray-800 text-gray-300"
          }`}
        >
          {p.approval}
        </span>
      </div>
    </article>
  );
}

{/* <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Apartment",
      name: p.title,
      address: { "@type": "PostalAddress", streetAddress: p.address },
      geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
      offers: { "@type": "Offer", price: p.rent, priceCurrency: "USD" }
    })
  }}
/> */}

