"use client";

import { useState, useEffect } from "react";
import { GitCompare, X, Download } from "lucide-react";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  roi: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  property_type: string;
  image_url?: string;
}

export function PropertyComparison() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);

  // Listen for property selection events
  useEffect(() => {
    const handleAddToCompare = (e: CustomEvent) => {
      const property = e.detail;
      if (selectedProperties.length < 4 && !selectedProperties.find(p => p.id === property.id)) {
        setSelectedProperties([...selectedProperties, property]);
        setIsOpen(true);
      }
    };

    window.addEventListener("addToCompare" as any, handleAddToCompare);
    return () => window.removeEventListener("addToCompare" as any, handleAddToCompare);
  }, [selectedProperties]);

  function removeProperty(id: string) {
    setSelectedProperties(selectedProperties.filter(p => p.id !== id));
    if (selectedProperties.length === 1) {
      setIsOpen(false);
    }
  }

  function exportComparison() {
    // Export as CSV or PDF
    const csvContent = generateCSV(selectedProperties);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property-comparison.csv';
    a.click();
  }

  function generateCSV(properties: Property[]): string {
    const headers = ['Address', 'City', 'State', 'Price', 'ROI', 'Bedrooms', 'Bathrooms', 'Sqft', 'Type'];
    const rows = properties.map(p => [
      p.address, p.city, p.state, p.price, p.roi, p.bedrooms, p.bathrooms, p.sqft, p.property_type
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  if (!isOpen || selectedProperties.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b141d] border-t border-white/10 shadow-2xl">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GitCompare size={20} className="text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              Property Comparison ({selectedProperties.length}/4)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportComparison}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedProperties.map((property) => (
            <div key={property.id} className="rounded-xl border border-white/10 bg-white/5 p-4 relative">
              <button
                onClick={() => removeProperty(property.id)}
                className="absolute top-2 right-2 rounded-full bg-red-500/10 p-1 text-red-300 hover:bg-red-500/20"
              >
                <X size={14} />
              </button>

              {property.image_url && (
                <img
                  src={property.image_url}
                  alt={property.address}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}

              <h4 className="font-semibold text-white text-sm mb-2 pr-6">
                {property.address}
              </h4>
              <p className="text-xs text-white/60 mb-3">
                {property.city}, {property.state}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Price</span>
                  <span className="font-semibold text-white">
                    ${property.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">ROI</span>
                  <span className="font-semibold text-emerald-400">
                    {property.roi}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Beds / Baths</span>
                  <span className="font-semibold text-white">
                    {property.bedrooms} / {property.bathrooms}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Sqft</span>
                  <span className="font-semibold text-white">
                    {property.sqft.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 4 - selectedProperties.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 flex items-center justify-center min-h-[200px]"
            >
              <div className="text-center">
                <GitCompare size={32} className="mx-auto mb-2 text-white/20" />
                <p className="text-xs text-white/40">Add property to compare</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
