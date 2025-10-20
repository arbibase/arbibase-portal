// src/app/api/integrations/sheets/pull/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One–way sync: Google Sheets (SheetBest) -> Supabase
 *
 * Trigger:
 *   - Manual: GET /api/integrations/sheets/pull?secret=YOUR_PULL_SECRET
 *   - Scheduled: Vercel Cron (configure in vercel.json or dashboard)
 *
 * Env required:
 *   SHEETBEST_ENDPOINT   - e.g. https://api.sheetbest.com/sheets/<uuid>
 *   SHEETS_PULL_SECRET   - simple shared secret for this route
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

export const runtime = "nodejs";
export const revalidate = 0;

type SheetRow = {
  id?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  rent?: string | number;
  beds?: string | number;
  baths?: string | number;
  approval?: string; // STR | MTR | STR/MTR | etc
  verified?: string | boolean;
  verified_at?: string;
  photo_url?: string;
  headline?: string;
  notes?: string;
  // ...any other columns you keep in the sheet
};

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^true|yes|1$/i.test(v.trim());
  return false;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const provided = url.searchParams.get("secret");
    const expected = process.env.SHEETS_PULL_SECRET;
    if (!expected || provided !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const SHEETBEST_ENDPOINT = process.env.SHEETBEST_ENDPOINT;
    if (!SHEETBEST_ENDPOINT) {
      return NextResponse.json({ ok: false, error: "SHEETBEST_ENDPOINT missing" }, { status: 500 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: "Supabase env missing" }, { status: 500 });
    }

    // 1) Pull rows from SheetBest
    const r = await fetch(SHEETBEST_ENDPOINT, { cache: "no-store" });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `SheetBest: ${r.status} ${t}` }, { status: 502 });
    }
    const rows = (await r.json()) as SheetRow[];

    // 2) Transform rows into your properties schema
    const payload = rows
      .map((row) => {
        const approved = (row.approval || "").toString().toUpperCase();
        const verified = toBool(row.verified);
        return {
          // Choose your conflict key below (see upsert onConflict)
          sheet_id: row.id ?? null,
          address: row.address ?? null,
          city: row.city ?? null,
          state: row.state ?? null,
          postal_code: row.zip ?? null,
          rent: row.rent ? Number(row.rent) : null,
          beds: row.beds ? Number(row.beds) : null,
          baths: row.baths ? Number(row.baths) : null,
          approval: approved || null, // "STR" | "MTR" | "STR/MTR" etc
          verified,
          verified_at: row.verified_at ?? null,
          photo_url: row.photo_url ?? null,
          headline: row.headline ?? null,
          notes: row.notes ?? null,
          source: "sheetbest",
        };
      })
      // keep only rows with at least an address or sheet_id
      .filter((p) => p.sheet_id || p.address);

    // 3) Upsert into Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // IMPORTANT: Ensure you have a unique index on properties.sheet_id
    //   e.g. ALTER TABLE properties ADD CONSTRAINT properties_sheet_id_key UNIQUE (sheet_id);
    const { error: upsertErr, count } = await supabase
      .from("properties")
      .upsert(payload, { onConflict: "sheet_id", ignoreDuplicates: false, count: "exact" });

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      pulled: rows.length,
      upserted: count ?? payload.length,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
