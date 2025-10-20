"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import type { Property } from "./PropertyCard";

// react-leaflet must be dynamically imported on the client
const LeafletMap = dynamic(async () => {
  const L = await import("react-leaflet");
  return ({ children, ...props }: any) => <L.MapContainer {...props}>{children}</L.MapContainer>;
}, { ssr: false });

const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, { ssr: false });
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, { ssr: false });

type Props = {
  properties?: (Property & { lat?: number; lng?: number })[];
  height?: number;
};

function MapPane({ properties = [], height = 420 }: Props) {
  const center = useMemo(() => {
    const withGeo = properties.filter((p) => p.lat && p.lng) as Required<Pick<Property, never>> & { lat: number; lng: number }[];
    if (withGeo.length) {
      const { lat, lng } = withGeo[0];
      return [lat, lng] as [number, number];
    }
    return [39.5, -98.35] as [number, number]; // US center
  }, [properties]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1e2733]" style={{ height }}>
      <LeafletMap center={center} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer {...({ attribution: "&copy; OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" } as any)} />
        {properties
          .filter((p) => p.lat && p.lng)
          .map((p) => (
            <Marker key={p.id} position={[p.lat as number, p.lng as number]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{p.city}, {p.state}</div>
                  <div>${p.rent?.toLocaleString?.()}/mo</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </LeafletMap>
    </div>
  );
}
export default memo(MapPane);
