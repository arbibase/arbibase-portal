export type Approval = "STR" | "MTR" | "Either";

export type PropertyDemo = {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zipcode?: string;
  rent: number;
  beds: number;
  baths: number;
  sqft?: number;
  approval: Approval;
  lat: number;
  lng: number;
  photos: string[];
  description?: string;
  amenities?: string[];
};

export const DEMO_PROPERTIES: PropertyDemo[] = [
  {
    id: "1",
    title: "Bayview Furnished Condo",
    address: "1100 West Ave, Miami Beach, FL 33139",
    city: "Miami", state: "FL", rent: 3800, beds: 2, baths: 2, approval: "STR",
    lat: 25.7847, lng: -80.1417,
    photos: ["/demo/miami-1.jpg","/demo/miami-2.jpg","/demo/miami-3.jpg"],
    description: "Waterfront condo with bay views and modern finishes.",
    amenities: ["In-unit Laundry","Pool","Gym","Parking"]
  },
  {
    id: "2",
    title: "Downtown Studio",
    address: "301 W 2nd St, Austin, TX 78701",
    city: "Austin", state: "TX", rent: 2200, beds: 1, baths: 1, approval: "Either",
    lat: 30.2669, lng: -97.7437,
    photos: ["/demo/austin-1.jpg","/demo/austin-2.jpg"]
  },
  {
    id: "3",
    title: "Gulch Townhome",
    address: "1205 Demonbreun St, Nashville, TN 37203",
    city: "Nashville", state: "TN", rent: 1900, beds: 3, baths: 2, approval: "MTR",
    lat: 36.154, lng: -86.783,
    photos: ["/demo/nash-1.jpg","/demo/nash-2.jpg","/demo/nash-3.jpg"]
  },
  {
    id: "4",
    title: "LoHi 2-Bed",
    address: "1575 Boulder St, Denver, CO 80211",
    city: "Denver", state: "CO", rent: 2450, beds: 2, baths: 1, approval: "MTR",
    lat: 39.7576, lng: -105.009,
    photos: ["/demo/denver-1.jpg","/demo/denver-2.jpg"]
  },
  {
    id: "5",
    title: "Hyde Park 1-Bed",
    address: "2223 N Westshore Blvd, Tampa, FL 33607",
    city: "Tampa", state: "FL", rent: 2100, beds: 1, baths: 1, approval: "STR",
    lat: 27.961, lng: -82.516,
    photos: ["/demo/tampa-1.jpg","/demo/tampa-2.jpg"]
  },
];

export const getDemoProperty = (id: string) =>
  DEMO_PROPERTIES.find(p => p.id === id);
