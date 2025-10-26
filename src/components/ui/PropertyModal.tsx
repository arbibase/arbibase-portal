"use client";

import { FaBed, FaBath } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import Image from "next/image";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

export type PropertyForModal = (typeof DEMO_PROPERTIES)[number] & { image?: string; description?: string; amenities?: string[] };

export default function PropertyModal({
  property,
  onClose,
}: {
  property: PropertyForModal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white text-black rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{property.title ?? `${property.type} in ${property.city}`}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <MdClose className="text-2xl" />
            </button>
          </div>

          {/* hero image */}
          <div className="relative w-full h-72 rounded-lg overflow-hidden mb-4">
            <Image
              src={property.image ?? "https://images.unsplash.com/photo-1613490493576-7fde63acd811"}
              alt={property.title ?? "Property image"}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Details</h3>
              <p className="text-gray-700 mb-3">
                {property.description ?? `Address: ${property.address}, ${property.city}, ${property.state}`}
              </p>
              <div className="flex items-center gap-4 mb-4 text-gray-800">
                <span className="flex items-center gap-2"><FaBed /> {property.beds} Beds</span>
                <span className="flex items-center gap-2"><FaBath /> {property.baths} Baths</span>
                <span>${property.rent.toLocaleString()}/mo</span>
              </div>

              {property.amenities?.length ? (
                <>
                  <h3 className="text-xl font-semibold mb-2">Amenities</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    {property.amenities.map((a, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" /> {a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Contact</h3>
              <form className="space-y-3">
                <input className="w-full p-2 border rounded-lg" placeholder="Your name" />
                <input className="w-full p-2 border rounded-lg" placeholder="Your email" type="email" />
                <textarea className="w-full p-2 border rounded-lg" rows={4} placeholder="Message to the manager…" />
                <button type="button" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Send message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
