"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  GoogleMap,
  Marker,
  MarkerClusterer,
  useLoadScript,
} from "@react-google-maps/api";

type LatLng = { lat: number; lng: number };

export type MapPropertyPin = {
  id: string;
  title?: string;
  pos: LatLng;    // use city centroids for now
};

export type Bounds = {
  north: number; south: number; east: number; west: number;
};

export default function MapPane({
  center = { lat: 39.5, lng: -98.35 }, // US center
  zoom = 4,
  pins = [],
  onBoundsChange,
}: {
  center?: LatLng;
  zoom?: number;
  pins?: MapPropertyPin[];
  onBoundsChange?: (b: Bounds) => void;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // emit initial bounds
    const b = map.getBounds();
    if (b && onBoundsChange) emitBounds(b, onBoundsChange);
  }, [onBoundsChange]);

  const onIdle = useCallback(() => {
    if (!mapRef.current || !onBoundsChange) return;
    const b = mapRef.current.getBounds();
    if (b) emitBounds(b, onBoundsChange);
  }, [onBoundsChange]);

  if (!isLoaded) {
    return (
      <div className="gmap skeleton" />
    );
  }

  return (
    <div className="gmap">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onIdle={onIdle}
        options={{
          gestureHandling: "greedy",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: gmDarkStyle, // subtle dark map to match UI
        }}
      >
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {pins.map((p) => (
                <Marker
                  key={p.id}
                  position={p.pos}
                  clusterer={clusterer}
                  title={p.title}
                  // You can use custom icons later
                />
              ))}
            </>
          )}
        </MarkerClusterer>
      </GoogleMap>
    </div>
  );
}

function emitBounds(
  b: google.maps.LatLngBounds,
  cb: (bounds: Bounds) => void
) {
  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  cb({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
}

/** Minimal dark style (tweak later) */
const gmDarkStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b121a" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa5b1" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b121a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1b2634" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b3c0cf" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e2235" }] },
];
