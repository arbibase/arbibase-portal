// src/components/ui/MapPane.tsx
"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  MarkerClustererF,
} from "@react-google-maps/api";

export type MapMarker = {
  id: string;
  title?: string;
  position: google.maps.LatLngLiteral;
};

type Props = {
  initialCenter: google.maps.LatLngLiteral;
  initialZoom?: number;
  markers?: MapMarker[];
  /** called when visible bounds change */
  onBoundsChange?: (b: { north: number; south: number; east: number; west: number }) => void;
};

const LIBRARIES: (
  | "core"
  | "maps"
  | "places"
  | "geocoding"
  | "routes"
  | "marker"
  | "geometry"
)[] = ["places", "geometry"];

const containerStyle: React.CSSProperties = { width: "100%", height: "100%" };

function MapPaneImpl({
  initialCenter,
  initialZoom = 4,
  markers = [],
  onBoundsChange,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const options = useMemo<google.maps.MapOptions>(
    () => ({
      mapTypeControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
      draggable: true,
      streetViewControl: false,
      fullscreenControl: true,
    }),
    []
  );

  const handleLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // fit once on load if you want; otherwise let initialCenter/zoom stand
    // map.panTo(initialCenter); map.setZoom(initialZoom);
    if (onBoundsChange) {
      const b = map.getBounds();
      if (b) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        onBoundsChange({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
      }
    }
  }, [onBoundsChange]);

  const handleUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map || !onBoundsChange) return;
    const b = map.getBounds();
    if (!b) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    onBoundsChange({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
  }, [onBoundsChange]);

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={LIBRARIES}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCenter}
        zoom={initialZoom}
        options={options}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        onIdle={handleIdle}
      >
        <MarkerClustererF>
          {(clusterer) => (
            <>
              {markers.map((m) => (
                <Marker
                  key={m.id}
                  position={m.position}
                  clusterer={clusterer}
                  onClick={() => setActiveId(m.id)}
                />
              ))}
            </>
          )}
        </MarkerClustererF>

        {activeId && (() => {
          const m = markers.find(x => x.id === activeId)!;
          return (
            <InfoWindow position={m.position} onCloseClick={() => setActiveId(null)}>
              <div style={{ maxWidth: 220 }}>
                <strong>{m.title ?? "Listing"}</strong>
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </LoadScript>
  );
}

export default memo(MapPaneImpl);
