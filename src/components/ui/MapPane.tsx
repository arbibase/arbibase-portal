"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState, useEffect } from "react";
import type { Property } from "./PropertyCard";
import { LatLngBounds, Map as LeafletMapType } from "leaflet";
import { useMap } from "react-leaflet";

const LeafletMap = dynamic(
  async () => {
    const L = await import("react-leaflet");
    return ({ children, ...props }: any) => <L.MapContainer {...props}>{children}</L.MapContainer>;
  },
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, { ssr: false });
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, { ssr: false });
// useMap is imported directly from 'react-leaflet' above; do not dynamic() a hook.

type Props = {
  properties?: (Property & { lat?: number; lng?: number })[];
  height?: number;
  onBoundsChange?: (b: LatLngBounds) => void;
};

/** Handles interactive map + bound sync */
function MapPane({ properties = [], height = 420, onBoundsChange }: Props) {
  const center = useMemo(() => {
    const withGeo = properties.filter((p) => p.lat && p.lng);
    if (withGeo.length) {
      const { lat, lng } = withGeo[0] as any;
      return [lat, lng] as [number, number];
    }
    return [39.5, -98.35] as [number, number]; // default US center
  }, [properties]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1e2733]" style={{ height }}>
      <LeafletMap
        center={center}
        zoom={5}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map: LeafletMapType) => {
          if (onBoundsChange) onBoundsChange(map.getBounds());
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties
          .filter((p) => p.lat && p.lng)
          .map((p) => (
            <Marker key={p.id} position={[p.lat as number, p.lng as number]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">
                    {p.city}, {p.state}
                  </div>
                  <div>${p.rent?.toLocaleString?.()}/mo</div>
                </div>
              </Popup>
            </Marker>
          ))}
        <MapWatcher onBoundsChange={onBoundsChange} />
      </LeafletMap>
    </div>
  );
}

/** Internal component to detect map bound changes */
function MapWatcher({ onBoundsChange }: { onBoundsChange?: (b: LatLngBounds) => void }) {
  const map = useMap() as LeafletMapType;
  useEffect(() => {
    if (!map || !onBoundsChange) return;
    const handler = () => {
      const b = map.getBounds();
      onBoundsChange(b);
    };
    map.on("moveend", handler);
    return () => {
      map.off("moveend", handler);
    };
  }, [map, onBoundsChange]);
  return null;
}

export default memo(MapPane);
