"use client";

import { useState } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";
import MapPane from "@/components/ui/MapPane";
import {
  FaSwimmingPool, FaParking, FaDumbbell, FaWifi,
  FaUtensils, FaArrowLeft, FaArrowRight
} from "react-icons/fa";
import { MdSecurity, MdLocalLaundryService, MdPets } from "react-icons/md";

export function generateStaticParams() {
  return DEMO_PROPERTIES.map(p => ({ id: p.id }));
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const p = DEMO_PROPERTIES.find((x) => x.id === params.id);
  if (!p) return notFound();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedMap, setExpandedMap] = useState(false);
  const MapPaneAny = MapPane as any;

  // Placeholder fallback images if missing
  const propertyImages = p.photos?.length
    ? p.photos.map((url) => ({ url, alt: `${p.title}` }))
    : [
        { url: "https://images.unsplash.com/photo-1502005097973-6a7082348e28", alt: "Living room" },
        { url: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc", alt: "Bedroom" },
      ];

  const amenitiesIcons: Record<string, JSX.Element> = {
    Pool: <FaSwimmingPool />,
    Gym: <FaDumbbell />,
    Parking: <FaParking />,
    Wifi: <FaWifi />,
    Restaurant: <FaUtensils />,
    Security: <MdSecurity />,
    Laundry: <MdLocalLaundryService />,
    Pets: <MdPets />,
  };

  const handleImageError = (e: any) => {
    e.target.src = "https://images.unsplash.com/photo-1560448204-603b3fc33ddc";
  };

  const nextImage = () =>
    setCurrentImageIndex((i) => (i === propertyImages.length - 1 ? 0 : i + 1));

  const prevImage = () =>
    setCurrentImageIndex((i) => (i === 0 ? propertyImages.length - 1 : i - 1));

  return (
    <main className="container mx-auto px-4 py-6">
      {/* ============ Header ============ */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">{p.title}</h1>
        <p className="text-gray-400">{p.address}</p>
        <div className="flex flex-wrap gap-3 mt-2 text-gray-300">
          <span className="text-xl font-semibold text-white">${p.rent.toLocaleString()}</span>
          <span>/month</span>
          <span>• {p.beds} bd • {p.baths} ba</span>
          <span className="rounded-full border border-sky-600 bg-sky-900/40 px-2 py-0.5 text-xs font-extrabold text-sky-300">
            {p.approval}
          </span>
        </div>
      </header>

      {/* ============ Image Carousel ============ */}
      <section className="relative h-[500px] rounded-xl overflow-hidden mb-5">
        <Image
          src={propertyImages[currentImageIndex].url}
          alt={propertyImages[currentImageIndex].alt}
          fill
          onError={handleImageError}
          className="object-cover transition-opacity duration-500"
        />
        <button
          onClick={prevImage}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 p-3 rounded-full hover:bg-black/70"
        >
          <FaArrowLeft size={20} />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 p-3 rounded-full hover:bg-black/70"
        >
          <FaArrowRight size={20} />
        </button>

        {/* Thumbnails */}
        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2">
          {propertyImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`w-16 h-16 border-2 rounded-lg overflow-hidden ${
                i === currentImageIndex ? "border-sky-500" : "border-transparent opacity-70"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                width={64}
                height={64}
                onError={handleImageError}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      </section>

      {/* ============ Split Layout ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details + Amenities */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#1e2733] bg-[#0d131a] p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-3 text-white">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-gray-300">
              <div><p className="text-gray-400">Bedrooms</p><p className="font-medium">{p.beds}</p></div>
              <div><p className="text-gray-400">Bathrooms</p><p className="font-medium">{p.baths}</p></div>
              <div><p className="text-gray-400">Approval</p><p className="font-medium">{p.approval}</p></div>
              <div><p className="text-gray-400">Type</p><p className="font-medium">{p.type}</p></div>
            </div>
          </div>

          {"description" in p && (p as any).description && (
            <div className="rounded-xl border border-[#1e2733] bg-[#0d131a] p-6 shadow-lg">
              <h2 className="text-2xl font-semibold mb-3 text-white">Description</h2>
              <p className="text-gray-300 leading-relaxed">{(p as any).description}</p>
            </div>
          )}

          {"amenities" in p && (p as any).amenities?.length ? (
            <div className="rounded-xl border border-[#1e2733] bg-[#0d131a] p-6 shadow-lg">
              <h2 className="text-2xl font-semibold mb-3 text-white">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-gray-300">
                {(p as any).amenities.map((a: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sky-400 text-lg">
                      {amenitiesIcons[a] ?? "•"}
                    </span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Map + Address */}
        <div className="lg:col-span-1">
          <div
            className={`rounded-xl border border-[#1e2733] bg-[#0d131a] p-3 transition-all duration-300 ${
              expandedMap ? "h-[540px]" : "h-[320px]"
            } overflow-hidden cursor-pointer`}
            onClick={() => setExpandedMap(!expandedMap)}
          >
            <MapPaneAny
              initialCenter={{ lat: p.lat, lng: p.lng }}
              initialZoom={expandedMap ? 13 : 14}
              markers={[
                { id: p.id, title: p.title, position: { lat: p.lat, lng: p.lng } },
              ]}
            />
          </div>
          <div className="mt-3 text-gray-300 text-sm">
            <p className="font-semibold text-white mb-1">Address</p>
            <p>{p.address}</p>
            <p className="mt-2 text-gray-400 text-xs">
              Click map to {expandedMap ? "shrink" : "expand"}.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
