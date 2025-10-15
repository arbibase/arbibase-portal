import type { NextApiRequest, NextApiResponse } from "next";

// ---- CORS helpers (unchanged) ----
const DEFAULT_ALLOWED = [
  "https://arbibase.com",
  "https://www.arbibase.com",
  "https://arbibase-portal.vercel.app",
  "http://localhost:3000",
];

function getAllowedOrigins(): string[] {
  const env = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return env.length ? env : DEFAULT_ALLOWED;
}

function setCORS(res: NextApiResponse, origin: string | null) {
  const allowed = getAllowedOrigins();

  // allow exact or wildcard prefix (e.g. https://*.hostingersite.com)
  const match = (o: string) =>
    allowed.includes(o) ||
    allowed.some((a) => (a.endsWith("*") ? o.startsWith(a.slice(0, -1)) : false));

  const allowOrigin = origin && match(origin) ? origin : allowed[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ---- small utils ----
function sanitize(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}
const s = sanitize;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res, req.headers.origin || null);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "/api/ghl" });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // honeypot
    if (body.website && String(body.website).trim()) {
      return res.status(200).json({ ok: true, spam: true });
    }

    const roleRaw = s(body.role);
    const role = roleRaw.toLowerCase();

    // Consider it a "request verification" payload if either:
    // - client sends role synonymous with “request”, OR
    // - payload includes request_id or a non-empty properties array
    const isVerification =
      role === "request" ||
      role === "request-verification" ||
      role === "verification" ||
      Boolean(body.request_id) ||
      (Array.isArray(body.properties) && body.properties.length > 0);

    // ---- Choose webhook URL ----
    let webhook = "";
    if (role === "owner") {
      webhook = process.env.GHL_WEBHOOK_OWNER || "";
    } else if (role === "operator") {
      webhook = process.env.GHL_WEBHOOK_OPERATOR || "";
    } else if (role === "coach") {
      webhook = process.env.GHL_WEBHOOK_COACH || "";
    } else if (isVerification) {
      webhook = process.env.GHL_WEBHOOK_REQUEST || "";
    }

    if (!webhook) {
      return res.status(400).json({ ok: false, error: `Missing or invalid role: "${roleRaw}"` });
    }

    // ---- Normalize payloads for GHL ----
    let payload: Record<string, unknown>;

    if (isVerification) {
      // Request Verification: send minimal + properties as JSON string (easy to map in GHL)
      payload = {
        email: s(body.email),
        request_id: s(body.request_id),
        notes: s(body.notes),
        properties_json: JSON.stringify(body.properties || []),
        source: process.env.GHL_WAITLIST_SOURCE || "ArbiBase Portal",
        page: s(body.page) || req.headers.referer || "",
        submitted_at: new Date().toISOString(),
      };
    } else {
      // Waitlist (Owner / Operator / Coach)
      payload = {
        role: roleRaw, // keep original casing if you like
        first_name: s(body.first_name),
        last_name: s(body.last_name),
        email: s(body.email),
        phone: s(body.phone),
        consent: !!body.consent,
        source: process.env.GHL_WAITLIST_SOURCE || "PreLaunch",
        page: s(body.page) || req.headers.referer || "",

        // Group owner custom fields under custom_fields to mirror your GHL form mapping
        custom_fields: {
          "Street Address": s(body.address1),
          City: s(body.city),
          State: s(body.state),
          "Postal Code": s(body.postal_code),
          "Willing to allow STR/MTR?": s(body.willing_to_allow_strmtr),
          "Preferred Lease Term": s(body.preferred_lease_term),
          "Notes - Building rules, HOA notes, etc.": s(body.notes__building_rules_hoa_notes_etc),
        },

        // Operator
        markets: s(body.markets),
        experience_level: s(body.experience_level),
        approval_preference: s(body.approval_preference),

        // Coach
        company_name: s(body.company_name),
        website: s(body.website),
        program_brand: s(body.program_brand),

        submitted_at: new Date().toISOString(),
      };
    }

    // ---- Forward to GHL webhook ----
    const gh = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!gh.ok) {
      const text = await gh.text().catch(() => "");
      return res
        .status(502)
        .json({ ok: false, error: `GHL webhook ${gh.status}: ${text || gh.statusText}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Unhandled server error" });
  }
}
