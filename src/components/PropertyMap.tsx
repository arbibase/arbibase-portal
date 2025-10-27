"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import { useEffect } from "react";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  roi: number;
  latitude: number;
  longitude: number;
  image_url?: string;
}

interface PropertyMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
}

export default function PropertyMap({ properties, selectedProperty, onPropertySelect }: PropertyMapProps) {
  useEffect(() => {
    // Fix for default marker icon in React Leaflet
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  const defaultCenter: [number, number] = properties.length > 0 
    ? [properties[0].latitude, properties[0].longitude]
    : [37.7749, -122.4194]; // Default to San Francisco

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      className="h-full w-full"
      style={{ background: "#1a1a2e" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.latitude, property.longitude]}
          eventHandlers={{
            click: () => onPropertySelect(property),
          }}
        >
          <Popup>
            <div className="text-sm">
              <h4 className="font-semibold mb-1">{property.address}</h4>
              <p className="text-xs text-gray-600 mb-2">
                {property.city}, {property.state}
              </p>
              <div className="flex justify-between">
                <span className="font-bold">${property.price.toLocaleString()}</span>
                <span className="text-emerald-600 font-semibold">{property.roi}% ROI</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
