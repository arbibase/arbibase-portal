"use client";

import { useCallback, useMemo, useRef, useState, CSSProperties } from "react";
import {
  GoogleMap,
  Marker,
  MarkerClustererF,
  useJsApiLoader,
} from "@react-google-maps/api";

type Bounds = { north: number; south: number; east: number; west: number };

export type MapMarker = {
  id: string;
  title?: string;
  position: { lat: number; lng: number };
};

type Props = {
  /** Initial center for first render (controlled internally afterwards) */
  initialCenter: { lat: number; lng: number };
  /** Initial zoom (default 4) */
  initialZoom?: number;
  /** Optional markers to render (clustered) */
  markers?: MapMarker[];
  /** Called on idle (pan/zoom end) with current map bounds */
  onBoundsChange?: (b: Bounds) => void;
  /** Optional fixed height (px). Default 420 */
  heightPx?: number;
};

// keep libraries stable to avoid perf warning
const LIBRARIES = ["places"] as const;

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

export default function MapPane({
  initialCenter,
  initialZoom = 4,
  markers = [],
  onBoundsChange,
  heightPx = 420,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [center] = useState(initialCenter);
  const [zoom] = useState(initialZoom);

  const { isLoaded } = useJsApiLoader({
    id: "arbibase-gmaps",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES as unknown as undefined, // correct typing quirk
  });

  const handleLoad = useCallback((m: google.maps.Map) => {
    mapRef.current = m;
  }, []);

  const handleUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleIdle = useCallback(() => {
    if (!mapRef.current || !onBoundsChange) return;
    const b = mapRef.current.getBounds();
    if (!b) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    onBoundsChange({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    });
  }, [onBoundsChange]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      mapTypeControl: false,
      fullscreenControl: true,
      streetViewControl: false,
      // Using default (light) Google theme per your request
    }),
    []
  );

  if (!isLoaded) {
    return (
      <div
        className="w-full rounded-xl border border-[#1e2733] bg-[#0b121a]"
        style={{ height: heightPx }}
      />
    );
  }

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ height: heightPx }}
    >
      <GoogleMap
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        center={center}
        zoom={zoom}
        onIdle={handleIdle}
        options={mapOptions}
        mapContainerStyle={containerStyle}
      >
        {/* Clustered markers – correct render-prop usage */}
        {markers.length > 0 && (
          <MarkerClustererF averageCenter enableRetinaIcons gridSize={60}>
            {(clusterer) => (
              <>
                {markers.map((m) => (
                  <Marker
                    key={m.id}
                    position={m.position}
                    title={m.title}
                    clusterer={clusterer}
                  />
                ))}
              </>
            )}
          </MarkerClustererF>
        )}
      </GoogleMap>
    </div>
  );
}
