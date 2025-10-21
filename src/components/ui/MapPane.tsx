"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  MarkerF,
  MarkerClustererF,
  LoadScript,
} from "@react-google-maps/api";

type LatLng = { lat: number; lng: number };
export type MapMarker = {
  id: string;
  position: LatLng;
  title?: string;
  rent?: number;
};

const CONTAINER_STYLE = { width: "100%", height: "520px", borderRadius: "16px" };

/** IMPORTANT: keep libraries stable (prevents the LoadScript warning) */
const LIBRARIES: ("places")[] = ["places"];

/** A subtle dark style – readable on your UI */
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b121a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#bdeaff" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b121a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e2a38" }] },
  { featureType: "water", stylers: [{ color: "#0e1a26" }] },
];

export default function MapPane({
  markers,
  onBoundsChange,
  defaultCenter = { lat: 27.5, lng: -97.0 }, // Gulf-ish US center
  defaultZoom = 5,
}: {
  markers: MapMarker[];
  onBoundsChange?: (b: google.maps.LatLngBoundsLiteral) => void;
  defaultCenter?: LatLng;
  defaultZoom?: number;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const mapRef = useRef<google.maps.Map | null>(null);
  const [apiOk, setApiOk] = useState(true);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleIdle = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const b = m.getBounds();
    if (!b) return;
    const l = b.toJSON();
    onBoundsChange?.(l);
  }, [onBoundsChange]);

  const options = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      styles: MAP_STYLE,
      gestureHandling: "greedy",
    }),
    []
  );

  if (!apiKey) {
    return (
      <div className="fine" style={{ padding: 12 }}>
        Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={LIBRARIES}
      onError={() => setApiOk(false)}
    >
      {!apiOk ? (
        <div
          className="fine"
          style={{
            ...CONTAINER_STYLE,
            display: "grid",
            placeItems: "center",
            background: "#0f141c",
            border: "1px solid #1e2733",
          }}
        >
          Maps API failed to load. Check referrer allow-list and API key.
        </div>
      ) : (
        <GoogleMap
          onLoad={onLoad}
          onUnmount={onUnmount}
          onIdle={handleIdle}
          mapContainerStyle={CONTAINER_STYLE}
          options={options}
          center={defaultCenter}
          zoom={defaultZoom}
        >
          {/* Only render clusterer when we have valid positions */}
          {markers?.length > 0 && (
            <MarkerClustererF
              options={{
                minimumClusterSize: 2,
                gridSize: 60,
              }}
            >
              {(clusterer) =>
                (
                  <>
                    {markers.map((m) =>
                      m?.position
                        ? (
                            <MarkerF
                              key={m.id}
                              position={m.position}
                              clusterer={clusterer}
                              title={m.title}
                            />
                          )
                        : null
                    )}
                  </>
                )
              }
            </MarkerClustererF>
          )}
        </GoogleMap>
      )}
    </LoadScript>
  );
}
