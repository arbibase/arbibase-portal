import { NextResponse } from "next/server";
import { DEMO_PROPERTIES } from "@/lib/properties-demo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").toLowerCase();
  const min = Number(searchParams.get("min") || "");
  const max = Number(searchParams.get("max") || "");
  const beds = Number(searchParams.get("beds") || "");
  const baths = Number(searchParams.get("baths") || "");
  const type = searchParams.get("type") || ""; // Apartment, House, ...
  const approval = searchParams.get("approval") || ""; // STR, MTR, Either

  const north = Number(searchParams.get("north") || "");
  const south = Number(searchParams.get("south") || "");
  const east  = Number(searchParams.get("east")  || "");
  const west  = Number(searchParams.get("west")  || "");

  let list = DEMO_PROPERTIES.filter((p) => {
    if (q) {
      const hay = `${p.title} ${p.address} ${p.city} ${p.state} ${p.zip}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (Number.isFinite(min) && p.rent < min) return false;
    if (Number.isFinite(max) && p.rent > max) return false;
    if (Number.isFinite(beds) && p.beds < beds) return false;
    if (Number.isFinite(baths) && p.baths < baths) return false;
    if (type && p.type !== type) return false;
    if (approval && approval !== "Either" && p.approval !== approval) return false;

    if ([north, south, east, west].every(Number.isFinite)) {
      if (!(p.lat <= north && p.lat >= south && p.lng <= east && p.lng >= west)) return false;
    }
    return true;
  });

  return NextResponse.json({ results: list, count: list.length });
}
