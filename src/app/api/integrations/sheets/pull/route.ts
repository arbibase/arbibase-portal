import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SHEET_URL = process.env.SHEETBEST_URL!;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    if (!SHEET_URL) throw new Error("Missing SHEETBEST_URL");

    // 1️⃣ Fetch data from SheetBest
    const sheetRes = await fetch(SHEET_URL);
    if (!sheetRes.ok) throw new Error(`SheetBest fetch failed: ${sheetRes.status}`);
    const rows = await sheetRes.json();

    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ ok: true, imported: 0, note: "No data found in sheet" });
    }

    // 2️⃣ Normalize + map sheet data
    const normalize = (v: any) => (typeof v === "string" ? v.trim() : v);
    const toBool = (v: any) =>
      typeof v === "boolean"
        ? v
        : ["yes", "true", "1", "y"].includes(String(v).toLowerCase());

    const mapped = rows.map((r: any) => ({
      external_id: normalize(r.id || r.external_id || r.listing_id),
      name: normalize(r.name || r.property_name),
      address: normalize(r.address || r.street || ""),
      city: normalize(r.city || ""),
      state: normalize(r.state || ""),
      postal_code: normalize(r.zip || r.postal_code || ""),
      rent: Number(String(r.rent || "").replace(/[^0-9.]/g, "")) || null,
      beds: Number(r.beds || r.bedrooms) || null,
      baths: Number(r.baths || r.bathrooms) || null,
      approval: normalize(r.approval || r.approval_type || "MTR"),
      verified: toBool(r.verified || r.approved),
      verified_at: r.verified_at
        ? new Date(r.verified_at).toISOString()
        : new Date().toISOString(),
      owner_name: normalize(r.owner_name || r.landlord_name),
      owner_email: normalize(r.owner_email || r.landlord_email),
      owner_phone: normalize(r.owner_phone || r.landlord_phone),
      photo_url: normalize(r.photo_url || r.photos || r.image || ""),
      source: "google_sheet",
    }));

    // 3️⃣ Upsert into Supabase
    const supabase = createClient(SUPA_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("properties")
      .upsert(mapped, { onConflict: "external_id", ignoreDuplicates: false })
      .select("id");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      imported: mapped.length,
      upserted: data?.length ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Sync failed" },
      { status: 500 },
    );
  }
}

export const crons = [
  { path: "/api/integrations/sheets/pull", schedule: "0 */3 * * *" }
];
