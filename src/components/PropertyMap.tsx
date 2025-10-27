"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
    markerClusterer: any; // Only markerClusterer, not MarkerClusterer
  }
}

interface Property {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  price?: number;
  roi?: number;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  lat?: number;
  lng?: number;
}

interface Props {
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (p: Property) => void;
  mapView?: "street" | "satellite";
}

export default function PropertyMap({ properties, selectedProperty, onPropertySelect, mapView = "street" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterRef = useRef<any>(null);

  // Utility to load a script once
  function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  // Initialize map when element appears
  useEffect(() => {
    if (!ref.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
      return;
    }

    let mounted = true;

    async function setup() {
      try {
        if (!window.google) {
          await loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`);
        }
        // load markerclusterer (tolerant)
        if (!window.markerClusterer) {
          try {
            await loadScript("https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js");
          } catch (e) {
            // clusterer optional — continue without it
            console.warn("MarkerClusterer failed to load, continuing without clustering", e);
          }
        }

        if (!mounted) return;

        const center = properties.length > 0
          ? { lat: properties[0].latitude ?? properties[0].lat ?? 37.7749, lng: properties[0].longitude ?? properties[0].lng ?? -122.4194 }
          : { lat: 39.8283, lng: -98.5795 };

        mapRef.current = new window.google.maps.Map(ref.current, {
          center,
          zoom: properties.length > 0 ? 6 : 4,
          mapTypeId: mapView === "satellite" ? "satellite" : "roadmap",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          ],
        });

        createMarkers();
      } catch (e) {
        console.error("PropertyMap setup error:", e);
      }
    }

    setup();

    return () => {
      mounted = false;
      // cleanup markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (clusterRef.current && typeof clusterRef.current.clearMarkers === "function") {
        try { clusterRef.current.clearMarkers(); } catch (_) { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  // Update map view (satellite/roadmap)
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapView === "satellite" ? "satellite" : "roadmap");
    }
  }, [mapView]);

  // Re-create markers when properties change
  useEffect(() => {
    if (!mapRef.current) return;
    createMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  // Pan to selected property
  useEffect(() => {
    if (!selectedProperty || !mapRef.current) return;
    const lat = selectedProperty.latitude ?? selectedProperty.lat;
    const lng = selectedProperty.longitude ?? selectedProperty.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(14);
    }
  }, [selectedProperty]);

  function createMarkers() {
    if (!mapRef.current || !window.google) return;

    // clear existing
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (clusterRef.current && typeof clusterRef.current.clearMarkers === "function") {
      try { clusterRef.current.clearMarkers(); } catch (e) { /* ignore */ }
      clusterRef.current = null;
    }

    const valid = properties.filter(p => (p.latitude ?? p.lat) && (p.longitude ?? p.lng));
    const markers: any[] = valid.map(p => {
      const lat = p.latitude ?? p.lat!;
      const lng = p.longitude ?? p.lng!;
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        title: p.address ?? "",
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: p.latitude ? "#34d399" : "#9ca3af",
          fillOpacity: 0.95,
          strokeWeight: 1,
          strokeColor: "#10b981",
          scale: 8,
        },
      });

      const info = new window.google.maps.InfoWindow({
        content: `
          <div style="min-width:200px;color:#000">
            <div style="font-weight:600;margin-bottom:6px;">${p.address ?? ""}</div>
            <div style="font-size:12px;color:#444;margin-bottom:8px;">${p.city ?? ""}${p.state ? ", " + p.state : ""}</div>
            <div style="display:flex;justify-content:space-between;">
              <div style="font-weight:600;">$${(p.price ?? 0).toLocaleString()}</div>
              <div style="color:#10b981;font-weight:600;">${(p.roi ?? 0)}% ROI</div>
            </div>
          </div>
        `,
      });

      marker.addListener("click", () => {
        onPropertySelect(p);
        info.open(mapRef.current, marker);
      });

      marker.addListener("mouseover", () => {
        // no-op for now; consumer can react to selectedProperty
      });

      return marker;
    });

    markersRef.current = markers;

    // Create clusterer if available
    try {
      const MC = (window as any).markerClusterer;
      if (MC) {
        clusterRef.current = new MC({ markers, map: mapRef.current });
      }
    } catch (e) {
      // fallback: do nothing
    }
  }

  return <div ref={ref} className="h-full w-full min-h-[300px]" />;
}
