"use client";

import { useMemo, useRef } from "react";
import { GoogleMap, Marker, InfoWindow, MarkerClusterer } from "@react-google-maps/api";

export type MapPin = {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
  price?: number;
  address?: string;
};

type Props = {
  initialCenter: google.maps.LatLngLiteral;
  initialZoom?: number;
  pins: MapPin[];
  selectedId?: string | null;
  onBoundsChange?: (b: {north:number;south:number;east:number;west:number}) => void;
  onSelect?: (id: string | null) => void;
};

const containerStyle = { width: "100%", height: "100%" };

export default function MapPane({
  initialCenter,
  initialZoom = 4,
  pins,
  selectedId,
  onBoundsChange,
  onSelect,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const options = useMemo<google.maps.MapOptions>(() => ({
    mapId: undefined, // keep default light style per Google TOS
    fullscreenControl: true,
    mapTypeControl: true,
    streetViewControl: false,
    clickableIcons: false,
  }), []);

  return (
    <GoogleMap
      onLoad={(m) => { mapRef.current = m; }}
      onUnmount={() => { mapRef.current = null; }}
      onIdle={() => {
        const b = mapRef.current?.getBounds();
        if (!b) return;
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        onBoundsChange?.({
          north: ne.lat(), east: ne.lng(),
          south: sw.lat(), west: sw.lng(),
        });
      }}
      center={initialCenter}
      zoom={initialZoom}
      options={options}
      mapContainerStyle={containerStyle}
    >
      <MarkerClusterer>
        {(clusterer) => (
          <>
            {pins.map((p) => (
              <Marker
                key={p.id}
                position={p.position}
                title={p.title}
                clusterer={clusterer}
                onClick={() => onSelect?.(p.id)}
              />
            ))}
          </>
        )}
      </MarkerClusterer>

      {selectedId && (() => {
        const sel = pins.find(p => p.id === selectedId);
        if (!sel) return null;
        return (
          <InfoWindow
            position={sel.position}
            onCloseClick={() => onSelect?.(null)}
          >
            <div style={{maxWidth:220}}>
              <div style={{fontWeight:700, marginBottom:4}}>{sel.title}</div>
              {sel.address && <div style={{fontSize:12, opacity:.8}}>{sel.address}</div>}
            </div>
          </InfoWindow>
        );
      })()}
    </GoogleMap>
  );
}
