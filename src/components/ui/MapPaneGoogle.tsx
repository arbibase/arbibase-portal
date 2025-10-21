"use client";

import { useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

type Pin = {
  id: string;
  coords: { lat: number; lng: number };
  label?: string;
};

interface MapPaneGoogleProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  pins?: Pin[];
  onBoundsChange?: (b: { south: number; west: number; north: number; east: number }) => void;
}

export default function MapPaneGoogle({
  center = { lat: 39.5, lng: -98.35 },
  zoom = 4,
  pins = [] as Pin[],
  onBoundsChange,
}: MapPaneGoogleProps): JSX.Element {
  const { isLoaded } = useJsApiLoader({
    id: "arbibase-gmaps",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  if (!isLoaded) return <div className="map-shell" />;

  return (
    <div className="map-shell">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        onBoundsChanged={() => {
          if (!onBoundsChange) return;
          const b = mapRef.current?.getBounds();
          if (!b) return;
          const ne = b.getNorthEast();
          const sw = b.getSouthWest();
          onBoundsChange({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
        }}
        options={{
          disableDefaultUI: false,
          clickableIcons: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        }}
      >
        {pins.map((p) => (
          <Marker key={p.id} position={p.coords} label={p.label} />
        ))}
      </GoogleMap>

      <style jsx>{`
        .map-shell {
          width: 100%;
          height: 100%;
          min-height: 460px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #223041;
          background: #0c121a;
        }
      `}</style>
    </div>
  );
}
