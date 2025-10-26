"use client";

import { useState } from "react";
import Image from "next/image";
import MapPane from "@/components/ui/MapPane";
import { 
  ArrowLeft, ArrowRight, MapPin, Bed, Bath, 
  CheckCircle, Star, Share, Heart 
} from "lucide-react";

type Property = {
  id: string;
  title: string;
  address: string;
  rent: number;
  beds: number;
  baths: number;
  approval: string;
  lat: number;
  lng: number;
  photos?: string[];
  description?: string;
  amenities?: string[];
};

export default function PropertyDetailClient({ property: p }: { property: Property }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedMap, setExpandedMap] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const photos = p.photos || [];
  const hasPhotos = photos.length > 0;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const MapPaneAny = MapPane as unknown as any;

  return (
    <main className="mx-auto max-w-[1140px] px-4 py-6 md:py-8">
      {/* Header with actions */}
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">{p.title}</h1>
          <div className="flex items-center gap-2 text-white/70">
            <MapPin size={16} />
            <span>{p.address}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold text-emerald-400">
              ${p.rent.toLocaleString()}
              <span className="text-base font-normal text-white/60">/month</span>
            </span>
            <div className="flex items-center gap-3 text-white/70">
              <span className="flex items-center gap-1">
                <Bed size={16} /> {p.beds} bd
              </span>
              <span className="flex items-center gap-1">
                <Bath size={16} /> {p.baths} ba
              </span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle size={12} className="inline mr-1" />
              {p.approval}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`rounded-lg border border-white/10 px-4 py-2 text-sm transition-all hover:bg-white/5 ${
              isFavorite ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/90"
            }`}
          >
            <Heart size={16} className="inline mr-1" fill={isFavorite ? "currentColor" : "none"} />
            Save
          </button>
          <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10">
            <Share size={16} className="inline mr-1" />
            Share
          </button>
        </div>
      </header>

      {/* Gallery with carousel */}
      {hasPhotos ? (
        <section className="mb-8">
          <div className="relative h-[500px] w-full overflow-hidden rounded-2xl bg-[#0f141c]">
            <Image
              src={photos[currentImageIndex]}
              alt={`${p.title} - Image ${currentImageIndex + 1}`}
              fill
              className="object-cover transition-opacity duration-500"
              priority={currentImageIndex === 0}
            />
            
            {photos.length > 1 && (
              <>
                <button
                  onClick={previousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70"
                  aria-label="Previous image"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70"
                  aria-label="Next image"
                >
                  <ArrowRight size={20} />
                </button>
                
                <div className="absolute bottom-4 right-4 rounded-lg bg-black/70 px-3 py-1 text-sm text-white backdrop-blur-sm">
                  {currentImageIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {photos.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                    currentImageIndex === index
                      ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#071019]"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image src={photo} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="mb-8 flex h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-[#0f141c]">
          <p className="text-white/40">No images available</p>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {p.description && (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">About this property</h2>
              <p className="leading-relaxed text-white/80">{p.description}</p>
            </section>
          )}

          {/* Facts & Features */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Property Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <span className="text-white/70">Bedrooms</span>
                <span className="font-semibold text-white">{p.beds}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <span className="text-white/70">Bathrooms</span>
                <span className="font-semibold text-white">{p.baths}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <span className="text-white/70">Monthly Rent</span>
                <span className="font-semibold text-emerald-400">${p.rent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <span className="text-white/70">Approval Status</span>
                <span className="font-semibold text-white">{p.approval}</span>
              </div>
            </div>

            {p.amenities && p.amenities.length > 0 && (
              <>
                <hr className="my-6 border-white/10" />
                <h3 className="mb-3 font-semibold text-white">Amenities</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {p.amenities.map((amenity: string) => (
                    <div key={amenity} className="flex items-center gap-2 text-white/80">
                      <CheckCircle size={16} className="text-emerald-400" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* CTA Section */}
          <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">Interested in this property?</h3>
            <p className="mb-4 text-sm text-white/70">
              Contact our team to schedule a viewing or get more information.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white transition-all hover:bg-emerald-600">
                Request Information
              </button>
              <button className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:bg-white/10">
                Schedule Viewing
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar - Map */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 font-semibold text-white">Location</h2>
              <div
                className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                  expandedMap ? "h-[600px]" : "h-[300px]"
                }`}
                onClick={() => setExpandedMap(!expandedMap)}
              >
                <MapPaneAny
                  initialCenter={{ lat: p.lat, lng: p.lng }}
                  initialZoom={14}
                  markers={[{ id: p.id, title: p.title, position: { lat: p.lat, lng: p.lng } }]}
                />
              </div>
              <div className="mt-3 space-y-1">
                <p className="flex items-start gap-2 text-sm text-white/80">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                  <span>{p.address}</span>
                </p>
                <button
                  onClick={() => setExpandedMap(!expandedMap)}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {expandedMap ? "Collapse" : "Expand"} map
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
