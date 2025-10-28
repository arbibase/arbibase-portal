"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
const ROICalculator = dynamic(
  () => import("@/components/roi-calculator"),
  { ssr: false }
);
import {
  Search, Filter, MapPin, Bed, Bath, DollarSign, Heart,
  Building2, Grid, Map as MapIcon, CheckCircle2,
  SlidersHorizontal, X, TrendingUp, ExternalLink, Sparkles
} from "lucide-react";
import { calculateLeadScore, getScoreColor, getScoreBg, getGradeBadge, type LeadScore } from "@/lib/lead-scoring";
import { Target, Star } from "lucide-react";

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  rent: number;
  beds: number;
  baths: number;
  property_type?: string;
  photo_url?: string;
  verified: boolean;
  summary?: string;
  lat?: number;
  lng?: number;
  favorite?: boolean;
  created_at?: string;
  roi_score_local?: number;
  view_count?: number;
  favorite_count?: number;
  revenue_monthly_est?: number;
  revenue_annual_est?: number;
  coc_estimate?: number;
};

type SortBy = "recommended" | "latest" | "rent_asc" | "rent_desc";

type Bounds = {
  n: number; // north
  s: number; // south
  e: number; // east
  w: number; // west
};

export default function PropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerClustererRef = useRef<any>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Property preview drawer
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDrawer, setShowPropertyDrawer] = useState(false);

  // ROI calculator
  const [showROICalculator, setShowROICalculator] = useState(false);
  const [roiProperty, setRoiProperty] = useState<Property | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [beds, setBeds] = useState("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);

  // Infinite scroll
  const PAGE_SIZE = 24;
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (viewMode === "map" && mapRef.current && !googleMapRef.current) {
      initializeMap();
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "map" && googleMapRef.current) {
      updateMapMarkers();
    }
  }, [filteredProperties, viewMode]);

  // Read URL params on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sort") as SortBy | null;
    const v = params.get("verified");
    const boundsStr = params.get("bounds");
    
    if (s && ["recommended", "latest", "rent_asc", "rent_desc"].includes(s)) setSortBy(s);
    if (v) setVerifiedOnly(v === "true");
    
    if (boundsStr) {
      try {
        const [s, n, w, e] = JSON.parse(boundsStr);
        setMapBounds({ n, s, e, w });
      } catch (e) {
        console.error("Invalid bounds in URL");
      }
    }
  }, []);

  // Write URL params
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams();
    params.set("sort", sortBy);
    params.set("verified", String(verifiedOnly));
    if (viewMode === "map" && mapBounds) {
      params.set("bounds", JSON.stringify([mapBounds.s, mapBounds.n, mapBounds.w, mapBounds.e]));
    }
    window.history.replaceState({}, "", `?${params.toString()}`);
  }, [sortBy, verifiedOnly, viewMode, mapBounds, loading]);

  // Infinite scroll observer
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && viewMode === "grid") {
        setPage((p) => p + 1);
      }
    }, { rootMargin: "400px" });
    if (loadMoreRef.current) io.observe(loadMoreRef.current);
    return () => io.disconnect();
  }, [viewMode]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, minRent, maxRent, beds, verifiedOnly, sortBy, selectedMarket]);

  // Map idle → filter by bounds
  useEffect(() => {
    if (!googleMapRef.current || viewMode !== "map") return;
    const idle = google.maps.event.addListener(googleMapRef.current, "idle", () => {
      const b = googleMapRef.current!.getBounds();
      if (b) {
        const newBounds = {
          n: b.getNorthEast().lat(),
          s: b.getSouthWest().lat(),
          e: b.getNorthEast().lng(),
          w: b.getSouthWest().lng()
        };
        setMapBounds(newBounds);
      }
      const filtered = filterByBounds(applyFilters(properties));
      setFilteredProperties(sortProps(filtered, sortBy));
    });
    return () => google.maps.event.removeListener(idle);
  }, [properties, sortBy, viewMode, searchQuery, minRent, maxRent, beds, verifiedOnly]);

  async function checkAuth() {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.replace("/login");
      return;
    }
    setLoading(false);
    fetchProperties();
  }

  async function fetchProperties() {
    if (!supabase) return;

    try {
      let query = supabase
        .from("properties")
        .select("*");

      // Apply bounds filter if in map mode
      if (mapBounds) {
        query = query
          .gte("lat", mapBounds.s)
          .lte("lat", mapBounds.n)
          .gte("lng", mapBounds.w)
          .lte("lng", mapBounds.e);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching properties:", error);
        setProperties(getMockProperties());
        setFilteredProperties(sortProps(getMockProperties(), sortBy));
        return;
      }

      if (data && data.length > 0) {
        setProperties(data as Property[]);
        setFilteredProperties(sortProps(data as Property[], sortBy));
      } else {
        setProperties(getMockProperties());
        setFilteredProperties(sortProps(getMockProperties(), sortBy));
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setProperties(getMockProperties());
      setFilteredProperties(sortProps(getMockProperties(), sortBy));
    }
  }

  function getMockProperties(): Property[] {
    return [
      {
        id: "1",
        name: "Downtown Loft",
        address: "301 West Avenue",
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        rent: 4250,
        beds: 2,
        baths: 2,
        property_type: "Condo",
        verified: true,
        summary: "Modern loft in the heart of downtown Austin with skyline views. Walking distance to entertainment district.",
        lat: 30.2672,
        lng: -97.7431,
        favorite: false,
        roi_score_local: 85,
        view_count: 142,
        favorite_count: 23,
        revenue_monthly_est: 4250,
        revenue_annual_est: 51000,
        coc_estimate: 38,
      },
      {
        id: "2",
        name: "Sunset Villa",
        address: "1845 Bayshore Boulevard",
        city: "Tampa",
        state: "FL",
        zip_code: "33606",
        rent: 3890,
        beds: 3,
        baths: 2,
        property_type: "House",
        verified: true,
        summary: "Beautiful waterfront villa with stunning sunset views over Tampa Bay.",
        lat: 27.9506,
        lng: -82.4572,
        favorite: false,
        roi_score_local: 82,
        view_count: 98,
        favorite_count: 18,
        revenue_monthly_est: 3890,
        revenue_annual_est: 46680,
        coc_estimate: 35,
      },
      {
        id: "3",
        name: "Music City Condo",
        address: "215 Broadway",
        city: "Nashville",
        state: "TN",
        zip_code: "37201",
        rent: 3650,
        beds: 2,
        baths: 2,
        property_type: "Condo",
        verified: true,
        summary: "Prime location on Broadway, steps from honky-tonks and live music venues.",
        lat: 36.1627,
        lng: -86.7816,
        favorite: true,
        roi_score_local: 78,
        view_count: 156,
        favorite_count: 31,
        revenue_monthly_est: 3650,
        revenue_annual_est: 43800,
        coc_estimate: 32,
      },
      {
        id: "4",
        name: "Beach House",
        address: "6789 Gulf Boulevard",
        city: "Tampa",
        state: "FL",
        zip_code: "33706",
        rent: 3420,
        beds: 3,
        baths: 2,
        property_type: "House",
        verified: false,
        summary: "Charming beach house just steps from the Gulf of Mexico.",
        lat: 27.7676,
        lng: -82.7857,
        favorite: false,
        roi_score_local: 68,
        view_count: 87,
        favorite_count: 12,
        revenue_monthly_est: 3420,
        revenue_annual_est: 41040,
        coc_estimate: 28,
      },
      {
        id: "5",
        name: "Riverside Retreat",
        address: "412 Colorado Street",
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        rent: 4650,
        beds: 3,
        baths: 3,
        property_type: "House",
        verified: true,
        summary: "Luxury home along Lady Bird Lake with private dock access.",
        lat: 30.2656,
        lng: -97.7467,
        favorite: true,
        roi_score_local: 92,
        view_count: 203,
        favorite_count: 45,
        revenue_monthly_est: 4650,
        revenue_annual_est: 55800,
        coc_estimate: 42,
      },
      {
        id: "6",
        name: "Desert Oasis",
        address: "2334 East Camelback Road",
        city: "Phoenix",
        state: "AZ",
        zip_code: "85016",
        rent: 3200,
        beds: 2,
        baths: 2,
        property_type: "Condo",
        verified: true,
        summary: "Modern condo in upscale Camelback corridor with resort-style amenities.",
        lat: 33.5092,
        lng: -112.0396,
        favorite: false,
        roi_score_local: 75,
        view_count: 76,
        favorite_count: 14,
        revenue_monthly_est: 3200,
        revenue_annual_est: 38400,
        coc_estimate: 31,
      },
      {
        id: "7",
        name: "Mountain View Lodge",
        address: "1875 Larimer Street",
        city: "Denver",
        state: "CO",
        zip_code: "80202",
        rent: 4100,
        beds: 3,
        baths: 2,
        property_type: "Townhouse",
        verified: true,
        summary: "Contemporary townhouse in LoDo with mountain views and rooftop deck.",
        lat: 39.7539,
        lng: -104.9971,
        favorite: false,
        roi_score_local: 81,
        view_count: 112,
        favorite_count: 22,
        revenue_monthly_est: 4100,
        revenue_annual_est: 49200,
        coc_estimate: 36,
      },
      {
        id: "8",
        name: "Historic Bungalow",
        address: "1456 12th Avenue South",
        city: "Nashville",
        state: "TN",
        zip_code: "37203",
        rent: 2890,
        beds: 2,
        baths: 1,
        property_type: "House",
        verified: false,
        summary: "Charming historic bungalow in trendy 12 South neighborhood.",
        lat: 36.1445,
        lng: -86.7892,
        favorite: false,
        roi_score_local: 64,
        view_count: 54,
        favorite_count: 8,
        revenue_monthly_est: 2890,
        revenue_annual_est: 34680,
        coc_estimate: 26,
      },
      {
        id: "9",
        name: "Lakefront Estate",
        address: "7823 Turkey Lake Road",
        city: "Orlando",
        state: "FL",
        zip_code: "32819",
        rent: 5200,
        beds: 4,
        baths: 3,
        property_type: "House",
        verified: true,
        summary: "Stunning lakefront estate near Universal Studios with private pool.",
        lat: 28.4589,
        lng: -81.4756,
        favorite: true,
        roi_score_local: 95,
        view_count: 287,
        favorite_count: 62,
        revenue_monthly_est: 5200,
        revenue_annual_est: 62400,
        coc_estimate: 45,
      },
      {
        id: "10",
        name: "Urban Studio",
        address: "98 Rainey Street",
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        rent: 2100,
        beds: 1,
        baths: 1,
        property_type: "Condo",
        verified: true,
        summary: "Compact studio in popular Rainey Street district, perfect for solo travelers.",
        lat: 30.2589,
        lng: -97.7389,
        favorite: false,
        roi_score_local: 72,
        view_count: 91,
        favorite_count: 16,
        revenue_monthly_est: 2100,
        revenue_annual_est: 25200,
        coc_estimate: 29,
      },
      {
        id: "11",
        name: "Scottsdale Villa",
        address: "7114 East Stetson Drive",
        city: "Phoenix",
        state: "AZ",
        zip_code: "85251",
        rent: 3800,
        beds: 3,
        baths: 2,
        property_type: "House",
        verified: true,
        summary: "Luxury villa in Old Town Scottsdale with golf course views.",
        lat: 33.4942,
        lng: -111.9261,
        favorite: false,
        roi_score_local: 79,
        view_count: 134,
        favorite_count: 25,
        revenue_monthly_est: 3800,
        revenue_annual_est: 45600,
        coc_estimate: 34,
      },
      {
        id: "12",
        name: "Gulf Coast Paradise",
        address: "3456 Beach Drive NE",
        city: "Tampa",
        state: "FL",
        zip_code: "33701",
        rent: 4500,
        beds: 3,
        baths: 3,
        property_type: "House",
        verified: true,
        summary: "Beachfront paradise with panoramic Gulf views and private beach access.",
        lat: 27.7676,
        lng: -82.6403,
        favorite: true,
        roi_score_local: 88,
        view_count: 198,
        favorite_count: 41,
        revenue_monthly_est: 4500,
        revenue_annual_est: 54000,
        coc_estimate: 39,
      },
      {
        id: "13",
        name: "Capitol View Apartment",
        address: "625 Lincoln Street",
        city: "Denver",
        state: "CO",
        zip_code: "80203",
        rent: 3100,
        beds: 2,
        baths: 1,
        property_type: "Apartment",
        verified: false,
        summary: "Modern apartment with views of the State Capitol building.",
        lat: 39.7267,
        lng: -104.9811,
        favorite: false,
        roi_score_local: 70,
        view_count: 67,
        favorite_count: 11,
        revenue_monthly_est: 3100,
        revenue_annual_est: 37200,
        coc_estimate: 27,
      },
      {
        id: "14",
        name: "Southern Charm Cottage",
        address: "2308 Franklin Pike",
        city: "Nashville",
        state: "TN",
        zip_code: "37204",
        rent: 2650,
        beds: 2,
        baths: 1,
        property_type: "House",
        verified: false,
        summary: "Quaint cottage in historic Melrose neighborhood with modern updates.",
        lat: 36.1156,
        lng: -86.7967,
        favorite: false,
        roi_score_local: 62,
        view_count: 43,
        favorite_count: 7,
        revenue_monthly_est: 2650,
        revenue_annual_est: 31800,
        coc_estimate: 24,
      },
      {
        id: "15",
        name: "Tech District Loft",
        address: "500 East 4th Street",
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        rent: 3890,
        beds: 2,
        baths: 2,
        property_type: "Loft",
        verified: true,
        summary: "Industrial-chic loft in East Austin's tech corridor with exposed brick.",
        lat: 30.2645,
        lng: -97.7389,
        favorite: false,
        roi_score_local: 83,
        view_count: 145,
        favorite_count: 28,
        revenue_monthly_est: 3890,
        revenue_annual_est: 46680,
        coc_estimate: 37,
      },
    ];
  }

  function recommendedScore(p: Property) {
    const roi = (p.roi_score_local ?? 0);
    const interaction = (p.view_count ?? 0) + 3 * (p.favorite_count ?? 0);
    const verifiedBoost = p.verified ? 8 : 0;
    return roi + 0.6 * interaction + verifiedBoost;
  }

  function sortProps(list: Property[], mode: SortBy): Property[] {
    const by = [...list];
    if (mode === "latest") {
      by.sort((a, b) => {
        const aTime = a.created_at ? +new Date(a.created_at) : 0;
        const bTime = b.created_at ? +new Date(b.created_at) : 0;
        return bTime - aTime;
      });
    }
    if (mode === "rent_asc") by.sort((a, b) => a.rent - b.rent);
    if (mode === "rent_desc") by.sort((a, b) => b.rent - a.rent);
    if (mode === "recommended") {
      by.sort((a, b) => recommendedScore(b) - recommendedScore(a));
    }
    return by;
  }

  function applyFilters(list: Property[]): Property[] {
    let filtered = [...list];

    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (minRent) {
      filtered = filtered.filter(p => p.rent >= parseInt(minRent));
    }

    if (maxRent) {
      filtered = filtered.filter(p => p.rent <= parseInt(maxRent));
    }

    if (beds !== "any") {
      filtered = filtered.filter(p => p.beds >= parseInt(beds));
    }

    if (verifiedOnly) {
      filtered = filtered.filter(p => p.verified);
    }

    if (selectedMarket) {
      filtered = filtered.filter(p => p.city.toLowerCase().includes(selectedMarket.toLowerCase()));
    }

    return filtered;
  }

  function filterByBounds(list: Property[]): Property[] {
    const map = googleMapRef.current;
    if (!map) return list;
    const b = map.getBounds();
    if (!b) return list;
    return list.filter(p => p.lat && p.lng && b.contains(new google.maps.LatLng(p.lat, p.lng)));
  }

  // Filter logic
  useEffect(() => {
    const filtered = applyFilters(properties);
    setFilteredProperties(sortProps(filtered, sortBy));
  }, [searchQuery, minRent, maxRent, beds, verifiedOnly, selectedMarket, properties, sortBy]);

  async function toggleFavorite(propertyId: string) {
    console.log("Toggle favorite:", propertyId);
  }

  function setCardRef(id: string) {
    return (el: HTMLDivElement | null) => {
      cardRefs.current[id] = el;
    };
  }

  function focusCard(id: string) {
    const el = cardRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.classList.add("ring-2", "ring-emerald-400/50");
    setTimeout(() => el.classList.remove("ring-2", "ring-emerald-400/50"), 900);
  }

  async function initializeMap() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found in environment variables');
      return;
    }

    if (typeof window === "undefined") return;

    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization`;
      script.async = true;
      script.onload = () => {
        loadMarkerClusterer();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
      };
      document.head.appendChild(script);
    } else {
      loadMarkerClusterer();
    }
  }

  function loadMarkerClusterer() {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js";
    script.async = true;
    script.onload = () => createMap();
    document.head.appendChild(script);
  }

  function createMap() {
    if (!mapRef.current) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 },
        zoom: 4,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
          },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      googleMapRef.current = map;
      updateMapMarkers();
    } catch (error) {
      console.error('Error creating map:', error);
    }
  }

  function updateMapMarkers() {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }

    // Create new markers with circular gradient dots
    const markers = filteredProperties
      .filter(p => p.lat && p.lng)
      .map((property) => {
        const marker = new google.maps.Marker({
          position: { lat: property.lat!, lng: property.lng! },
          title: property.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: property.verified ? "#34d399" : "#9ca3af",
            fillOpacity: 0.9,
            strokeWeight: property.verified ? 2 : 0,
            strokeColor: property.verified ? "#10b981" : "transparent",
            scale: property.verified ? 10 : 8,
          },
        });

        marker.addListener("click", () => {
          setSelectedProperty(property);
          setShowPropertyDrawer(true);
        });

        marker.addListener("mouseover", () => focusCard(property.id));

        return marker;
      });

    markersRef.current = markers;

    // Initialize clusterer with emerald theme
    if ((window as any).markerClusterer) {
      markerClustererRef.current = new (window as any).markerClusterer.MarkerClusterer({
        markers,
        map: googleMapRef.current!,
        renderer: {
          render: ({ count, position }: any) => new google.maps.Marker({
            position,
            label: {
              text: String(count),
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: "rgba(16,185,129,0.3)",
              fillOpacity: 1,
              strokeColor: "rgba(16,185,129,0.8)",
              strokeWeight: 2,
            },
          }),
        }
      });
    }
  }

  const topMarkets = ["Austin", "Tampa", "Nashville", "Phoenix", "Atlanta"];

  const displayedProperties = viewMode === "grid" 
    ? filteredProperties.slice(0, PAGE_SIZE * page)
    : filteredProperties;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  function openROICalculator(property: Property) {
    setRoiProperty(property);
    setShowROICalculator(true);
  }

  function handleROISave(results: any) {
    console.log("ROI results saved:", results);
    setShowROICalculator(false);
  }

  // Listen for custom event from cards
  useEffect(() => {
    const handler = (e: any) => openROICalculator(e.detail);
    window.addEventListener('openROI', handler);
    return () => window.removeEventListener('openROI', handler);
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Properties</span>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl">
              Property Browser
            </h1>
            <p className="mt-1 text-white/60 flex items-center gap-2">
              Discover verified arbitrage opportunities
              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                <TrendingUp size={12} /> +4% MoM ROI trend
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,.25)]"
                  : "border border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
              }`}
            >
              <Grid size={16} className="inline mr-2" /> Grid
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "map"
                  ? "bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,.25)]"
                  : "border border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
              }`}
            >
              <MapIcon size={16} className="inline mr-2" /> Map
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Sort Header */}
      <section className="sticky top-16 z-40 mb-4 rounded-xl border border-white/10 bg-[#0b141d]/95 backdrop-blur-md shadow-[0_10px_28px_-8px_rgba(0,0,0,.3)]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-sm text-white/70">
            <span className="font-semibold text-white">{filteredProperties.length}</span> results
          </span>
          <span className="text-white/40">•</span>
          <span className="text-sm text-white/60">Sorted by</span>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="recommended" className="bg-[#0b141d]">🎯 Recommended</option>
            <option value="latest" className="bg-[#0b141d]">✨ Newest</option>
            <option value="rent_asc" className="bg-[#0b141d]">💰 Rent ↑</option>
            <option value="rent_desc" className="bg-[#0b141d]">💰 Rent ↓</option>
          </select>

          <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-white/50">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white/70">Pan map to update results</span>
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>
      </section>

      {/* Main Layout with Left Rail */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Filter Rail - Desktop */}
        <aside className="hidden lg:block col-span-3">
          <div className="sticky top-[140px] rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4 shadow-[0_10px_28px_-8px_rgba(0,225,255,.08)]">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  verifiedOnly
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,.2)]"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <CheckCircle2 size={12} className="inline mr-1" />
                Verified
              </button>
              <button
                onClick={() => setSortBy("latest")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  sortBy === "latest"
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,.2)]"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <Sparkles size={12} className="inline mr-1" />
                New
              </button>
            </div>

            {/* Rent Range */}
            <div>
              <label className="mb-2 block text-xs font-medium text-white/70">Rent Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minRent}
                  onChange={(e) => setMinRent(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxRent}
                  onChange={(e) => setMaxRent(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="mb-2 block text-xs font-medium text-white/70">Bedrooms</label>
              <select 
                value={beds} 
                onChange={(e) => setBeds(e.target.value)} 
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="any" className="bg-[#0b141d]">Any</option>
                <option value="1" className="bg-[#0b141d]">1+</option>
                <option value="2" className="bg-[#0b141d]">2+</option>
                <option value="3" className="bg-[#0b141d]">3+</option>
                <option value="4" className="bg-[#0b141d]">4+</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Mobile Filter Panel */}
        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#0b141d] border-l border-white/10 p-4 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    verifiedOnly
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <CheckCircle2 size={12} className="inline mr-1" />
                  Verified
                </button>
                <button
                  onClick={() => setSortBy("latest")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    sortBy === "latest"
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Sparkles size={12} className="inline mr-1" />
                  New
                </button>
              </div>

              {/* Rent Range */}
              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">Rent Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minRent}
                    onChange={(e) => setMinRent(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">Bedrooms</label>
                <select 
                  value={beds} 
                  onChange={(e) => setBeds(e.target.value)} 
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="any" className="bg-[#0b141d]">Any</option>
                  <option value="1" className="bg-[#0b141d]">1+</option>
                  <option value="2" className="bg-[#0b141d]">2+</option>
                  <option value="3" className="bg-[#0b141d]">3+</option>
                  <option value="4" className="bg-[#0b141d]">4+</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="col-span-12 lg:col-span-9">
          {/* Market Chips - Show only in map view */}
          {viewMode === "map" && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {topMarkets.map(market => (
                <button
                  key={market}
                  onClick={() => setSelectedMarket(selectedMarket === market ? null : market)}
                  className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                    selectedMarket === market
                      ? "bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,.3)]"
                      : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  {market}
                  <span className="text-emerald-400 ml-2 font-semibold">▲{Math.floor(Math.random() * 30 + 50)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Content Area */}
          {viewMode === "grid" ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {displayedProperties.map((property) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    onToggleFavorite={toggleFavorite}
                    setRef={setCardRef(property.id)}
                  />
                ))}
              </section>
              <div ref={loadMoreRef} className="h-4" />
              {displayedProperties.length < filteredProperties.length && (
                <div className="mt-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              {/* Map with floating filters */}
              <div className="relative">
                <div ref={mapRef} className="h-[600px] rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_28px_-8px_rgba(0,225,255,.12)]">
                  {!googleMapRef.current && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center text-white/40 max-w-md px-4">
                        <MapIcon size={48} className="mx-auto mb-4" />
                        <p className="text-sm">Loading map...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Floating Mini-Filter Panel */}
                {googleMapRef.current && (
                  <div className="absolute top-4 left-4 rounded-xl bg-[#0b141d]/95 backdrop-blur-md border border-white/10 p-3 space-y-3 w-64 shadow-[0_10px_28px_-8px_rgba(0,0,0,.4)]">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Quick Filters</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verifiedOnly}
                          onChange={(e) => setVerifiedOnly(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500"
                          id="map-verified"
                        />
                        <label htmlFor="map-verified" className="text-sm text-white/90 cursor-pointer">
                          Verified only
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Rent Range</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={minRent}
                          onChange={(e) => setMinRent(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxRent}
                          onChange={(e) => setMaxRent(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Property List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onToggleFavorite={toggleFavorite}
                    compact
                    setRef={setCardRef(property.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredProperties.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <Building2 size={48} className="mx-auto mb-4 text-white/20" />
              <h3 className="mb-2 text-xl font-bold text-white">No properties found</h3>
              <p className="text-white/60">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </div>

      {/* Property Preview Drawer */}
      {showPropertyDrawer && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPropertyDrawer(false)}
          />
          <div className="relative h-full w-full max-w-md bg-[#0b141d] border-l border-white/10 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0b141d]/95 backdrop-blur-sm border-b border-white/10 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedProperty.name}</h2>
                  <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                    <MapPin size={14} />
                    {selectedProperty.city}, {selectedProperty.state}
                  </p>
                </div>
                <button
                  onClick={() => setShowPropertyDrawer(false)}
                  className="rounded-lg p-2 text-white/60 hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Hero Image */}
              <div className="relative h-64 rounded-xl overflow-hidden bg-linear-to-br from-sky-800/40 to-emerald-800/40">
                {selectedProperty.photo_url ? (
                  <img src={selectedProperty.photo_url} alt={selectedProperty.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2 size={64} className="text-white/20" />
                  </div>
                )}
                {selectedProperty.verified && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                      <CheckCircle2 size={14} /> Verified
                    </span>
                  </div>
                )}
              </div>

              {/* ROI Overlay */}
              {selectedProperty.revenue_monthly_est && selectedProperty.coc_estimate ? (
                <div className="rounded-xl bg-linear-to-br from-emerald-500/10 to-sky-500/10 border border-emerald-400/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Projected Revenue</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        ${selectedProperty.revenue_monthly_est.toLocaleString()}/mo
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/60 mb-1">Est. CoC</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {selectedProperty.coc_estimate}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setShowPropertyDrawer(false);
                    openROICalculator(selectedProperty);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Run ROI Analysis →
                </button>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <div className="text-2xl font-bold text-white">{selectedProperty.beds}</div>
                  <div className="text-xs text-white/60">Bedrooms</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <div className="text-2xl font-bold text-white">{selectedProperty.baths}</div>
                  <div className="text-xs text-white/60">Bathrooms</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">${selectedProperty.rent.toLocaleString()}</div>
                  <div className="text-xs text-white/60">Per Month</div>
                </div>
              </div>

              {/* Summary */}
              {selectedProperty.summary && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">About</h3>
                  <p className="text-sm text-white/70">{selectedProperty.summary}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Link
                  href={`/properties/${selectedProperty.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 shadow-[0_0_16px_rgba(16,185,129,.25)]"
                >
                  <ExternalLink size={16} />
                  View Full Details
                </Link>
                <button 
                  onClick={() => {
                    setShowPropertyDrawer(false);
                    openROICalculator(selectedProperty);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Analyze ROI
                </button>
                <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Request Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROI Calculator */}
{roiProperty && showROICalculator && (
  <ROICalculator
    property={roiProperty}
    isOpen={showROICalculator}
    onClose={() => setShowROICalculator(false)}
    onSave={handleROISave}
  />
)}
    </div>
  );
}

function PropertyCard({ property, onToggleFavorite, compact = false, setRef }: {
  property: Property;
  onToggleFavorite: (id: string) => void;
  compact?: boolean;
  setRef?: (el: HTMLDivElement | null) => void;
}) {
  // Calculate lead score
  const leadScore = calculateLeadScore(property);
  const gradeBadge = getGradeBadge(leadScore.grade);

  return (
    <article 
      ref={setRef}
      className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all hover:bg-white/8 hover:border-emerald-400/30 hover:shadow-[0_10px_28px_-8px_rgba(52,211,153,0.18)]"
    >
      <div className="relative h-40 overflow-hidden bg-linear-to-br from-sky-800/40 to-emerald-800/40">
        {property.photo_url ? (
          <img
            src={property.photo_url}
            alt={property.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 size={48} className="text-white/20" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {property.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 backdrop-blur-sm px-2 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle2 size={10} /> Verified
            </span>
          )}
          {/* Lead Score Badge */}
          <span className={`inline-flex items-center gap-1 rounded-full backdrop-blur-sm px-2 py-1 text-[11px] font-bold ring-1 ${gradeBadge.bg} ${gradeBadge.text} ring-white/30`}>
            <Star size={10} fill="currentColor" /> {leadScore.grade}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => onToggleFavorite(property.id)}
          className="absolute top-2 right-2 rounded-full bg-white/10 backdrop-blur-sm p-1.5 text-white transition-all hover:bg-white/20"
        >
          <Heart size={14} fill={property.favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-3">
        {/* Lead Score Display */}
        {!compact && (
          <div className="mb-2 flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${getScoreBg(leadScore.totalScore)}`}>
              <Target size={12} className={getScoreColor(leadScore.totalScore)} />
              <span className={`text-xs font-bold ${getScoreColor(leadScore.totalScore)}`}>
                {leadScore.totalScore}
              </span>
            </div>
            <span className="text-[10px] text-white/50">
              ${leadScore.breakdown.spread.toLocaleString()} spread
            </span>
          </div>
        )}

        <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{property.name}</h3>
        
        <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
          <MapPin size={12} />
          <span className="line-clamp-1">{property.city}, {property.state}</span>
        </div>

        {/* ROI Overlay */}
        {property.revenue_monthly_est && property.coc_estimate ? (
          <div className="mb-3 text-xs text-emerald-400/90">
            Projected: <span className="font-semibold">${property.revenue_monthly_est.toLocaleString()}/mo</span>
            {' · '}
            CoC: <span className="font-semibold">{property.coc_estimate}%</span>
          </div>
        ) : (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('openROI', { detail: property }))}
            className="mb-3 text-xs text-white/60 hover:text-emerald-400 transition-colors"
          >
            Run ROI →
          </button>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 mb-3 text-xs text-white/70">
          <div className="flex items-center gap-1">
            <Bed size={12} />
            <span>{property.beds}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={12} />
            <span>{property.baths}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign size={12} />
            <span>${property.rent.toLocaleString()}/mo</span>
          </div>
        </div>

        {/* Footer */}
        <Link
          href={`/properties/${property.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-all hover:shadow-[0_0_16px_rgba(16,185,129,.25)]"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}