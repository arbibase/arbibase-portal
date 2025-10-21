"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  GoogleMap,
  Marker,
  MarkerClustererF, // TS-friendly clusterer (v2+)
  useJsApiLoader,
} from "@react-google-maps/api";

export type LatLng = { lat: number; lng: number };
export type Bounds = { north: number; south: number; east: number; west: number };

export type GMapMarker = {
  id: string;
  position: LatLng;
  title?: string;
};

/** Keep libraries stable to avoid the "LoadScript reloaded" warning */
const GMAPS_LIBS = ["places"] as const;

export default function MapPane({
  initialCenter = { lat: 39.5, lng: -98.35 }, // US centroid
  initialZoom = 4,
  markers = [],
  onBoundsChange,
  height = 520,
}: {
  initialCenter?: LatLng;
  initialZoom?: number;
  markers?: GMapMarker[];
  onBoundsChange?: (b: Bounds) => void;
  height?: number;
}) {
  const { isLoaded } = useJsApiLoader({
    id: "arbibase-gmaps",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GMAPS_LIBS as unknown as undefined, // satisfies type
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Set initial view once; we don't pass center/zoom props so the user can pan/zoom freely
    map.setCenter(initialCenter);
    map.setZoom(initialZoom);
  }, [initialCenter, initialZoom]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const emitBounds = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const b = m.getBounds();
    if (!b) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    onBoundsChange?.({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    });
  }, [onBoundsChange]);

  const options = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: false,
      clickableIcons: true,
      gestureHandling: "greedy",
      keyboardShortcuts: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      zoomControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0b1118" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#b8c7d9" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0b1118" }] },
        { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2430" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b8c7d9" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1a24" }] },
      ],
      backgroundColor: "#0b1118",
    }),
    []
  );

  if (!isLoaded) {
    return (
      <div
        className="rounded-2xl border border-[#1f2a37] bg-[#0b1118] p-4 text-sm text-[#8fa6bd]"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1f2a37] bg-[#0b1118]" style={{ height }}>
      <GoogleMap
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={emitBounds}
        options={options}
        mapContainerStyle={{ width: "100%", height: "100%", borderRadius: 16 }}
      >
        <MarkerClustererF
          options={{
            minimumClusterSize: 2,
            // default clusterer style is fine; can be themed later
          }}
        >
          {(clusterer) => (
            <>
              {markers.map((m) => (
                <Marker
                  key={m.id}
                  position={m.position}
                  clusterer={clusterer}
                  title={m.title}
                />
              ))}
            </>
          )}
        </MarkerClustererF>
      </GoogleMap>
    </div>
  );
}
