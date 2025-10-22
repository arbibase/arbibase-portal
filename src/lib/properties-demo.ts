export type Approval = "STR" | "MTR" | "Either";
export type HomeType = "Apartment" | "House" | "Condo" | "Townhome" | "Duplex";

export type DemoProperty = {
  unit_type: any;
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  rent: number;
  beds: number;
  baths: number;
  type: HomeType;
  approval: Approval;
  photos?: string[];
};

export const DEMO_PROPERTIES: DemoProperty[] = [
  {
    id: "p1",
    title: "Brickell 2bd w/ Bay View",
    address: "1060 Brickell Ave, Miami, FL 33131",
    city: "Miami",
    state: "FL",
    zip: "33131",
    lat: 25.7641, lng: -80.1913,
    rent: 3800, beds: 2, baths: 2, type: "Apartment", approval: "STR",
    photos: ["/demo/mia1.jpg"],
    unit_type: undefined
  },
  {
    id: "p2",
    title: "East Austin 1bd Loft",
    address: "1802 E 6th St, Austin, TX 78702",
    city: "Austin",
    state: "TX",
    zip: "78702",
    lat: 30.2615, lng: -97.7240,
    rent: 2200, beds: 1, baths: 1, type: "Apartment", approval: "Either",
    photos: ["/demo/aus1.jpg"],
    unit_type: undefined
  },
  {
    id: "p3",
    title: "12 South Family Home",
    address: "2301 10th Ave S, Nashville, TN 37204",
    city: "Nashville",
    state: "TN",
    zip: "37204",
    lat: 36.1245, lng: -86.7886,
    rent: 1900, beds: 3, baths: 2, type: "House", approval: "MTR",
    photos: ["/demo/bna1.jpg"],
    unit_type: undefined
  },
  {
    id: "p4",
    title: "Capitol Hill 2bd",
    address: "1200 N Sherman St, Denver, CO 80203",
    city: "Denver",
    state: "CO",
    zip: "80203",
    lat: 39.7354, lng: -104.9856,
    rent: 2450, beds: 2, baths: 1, type: "Condo", approval: "MTR",
    photos: ["/demo/den1.jpg"],
    unit_type: undefined
  },
  {
    id: "p5",
    title: "Hyde Park 1bd",
    address: "210 S Hyde Park Ave, Tampa, FL 33606",
    city: "Tampa",
    state: "FL",
    zip: "33606",
    lat: 27.9400, lng: -82.4687,
    rent: 2100, beds: 1, baths: 1, type: "Apartment", approval: "STR",
    photos: ["/demo/tpa1.jpg"],
    unit_type: undefined
  },
];

