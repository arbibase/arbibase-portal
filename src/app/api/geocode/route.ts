import { NextResponse } from "next/server";

const KEY = process.env.GOOGLE_MAPS_API_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!KEY) return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  // Reverse geocode
  if (lat && lng) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    const best = j.results?.[0];
    return NextResponse.json({
      type: "reverse",
      result: best ? {
        formatted: best.formatted_address,
        location: best.geometry.location,
        viewport: best.geometry.viewport,
      } : null
    });
  }

  // Forward autocomplete + first geocode
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const ac = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      q
    )}&types=geocode&key=${KEY}`
  ).then(r => r.json());

  const first = ac.predictions?.[0];
  if (!first) return NextResponse.json({ type: "forward", result: null });

  const details = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${first.place_id}&key=${KEY}`
  ).then(r => r.json());

  const g = details.result?.geometry;
  return NextResponse.json({
    type: "forward",
    result: details.result ? {
      formatted: details.result.formatted_address,
      location: g?.location,
      viewport: g?.viewport,
    } : null
  });
}
