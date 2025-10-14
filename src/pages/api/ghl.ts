import type { NextApiRequest, NextApiResponse } from "next";

// ---- CORS helpers (unchanged in spirit) ----
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
  if (!origin) return getAllowedOrigins()[0];
  const allowed = getAllowedOrigins();
 const allowOrigin =
    origin &&
    (allowed.includes(origin) ||
      allowed.some((a) =>
        a.endsWith("*") ? origin.startsWith(a.slice(0, -1)) : false
      ))
      ? origin
      : allowed[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCORS(res, req.headers.origin || null);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET")
    return res.status(200).json({ ok: true, route: "/api/ghl" });
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
        const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    // honeypot
        if (body.website && String(body.website).trim()) {
      return res.status(200).json({ ok: true, spam: true });
    }

    const role = s(body.role);

    // --- Detect verification request payload (no role, but has request info) ---
    const isVerification =
      !role &&
      (Boolean(body.request_id) ||
        (Array.isArray(body.properties) && body.properties.length > 0));

    // ---- Choose webhook URL ----
    let webhook = "";
    if (role.toLowerCase() === "owner")
      webhook = process.env.GHL_WEBHOOK_OWNER || "";
    else if (role.toLowerCase() === "operator")
      webhook = process.env.GHL_WEBHOOK_OPERATOR || "";
    else if (role.toLowerCase() === "coach")
      webhook = process.env.GHL_WEBHOOK_COACH || "";
    else if (isVerification) webhook = process.env.GHL_WEBHOOK_REQUEST || "";

    if (!webhook) {
      return res
        .status(400)
        .json({ ok: false, error: `Missing or invalid role: "${role}"` });
    }

   // ---- Normalize payloads for GHL ----
    let payload: Record<string, unknown>;

    if (isVerification) {
      // Minimal fields GHL needs for a “Request Verification” contact/activity
      payload = {
        email: sanitize(body.email),
        request_id: sanitize(body.request_id),
        notes: sanitize(body.notes),
        // Send properties as a string so it’s easy to map on GHL side
        properties_json: JSON.stringify(body.properties || []),
        source: process.env.GHL_WEBHOOK_REQUEST || "ArbiBase Portal",
        page: sanitize(body.page) || req.headers.referer || "",
        submitted_at: new Date().toISOString(),
      };
    } else {
      // Waitlist (Owner / Operator / Coach)
      payload = {
        role,
        first_name: sanitize(body.first_name),
        last_name: sanitize(body.last_name),
        email: sanitize(body.email),
        phone: sanitize(body.phone),
        consent: !!body.consent,
        source: process.env.GHL_WAITLIST_SOURCE || "PreLaunch",
        page: sanitize(body.page) || req.headers.referer || "",

        // Owner
        address1: sanitize(body.street_address),
        city: sanitize(body.city),
        state: sanitize(body.state),
        postal_code: sanitize(body.postal_code),
        willing_to_allow_strmtr: sanitize(body.approval),
        preferred_lease_term: sanitize(body.lease_term),
        notes__building_rules_hoa_notes_etc: sanitize(body.notes),

        // Operator
        markets: sanitize(body.markets),
        experience_level: sanitize(body.experience_level),
        approval_preference: sanitize(body.approval_preference),

        // Coach
        company_name: sanitize(body.company_name),
        website: sanitize(body.website),
        program_brand: sanitize(body.program_brand),

        submitted_at: new Date().toISOString(),
      };
    }
// NOTE: forward the previously-normalized payload to the chosen GHL webhook
    const gh = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore – prevent caching in Next
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
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Unhandled server error" });
  }
}
function sanitize(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function s(value: any): string {
  return sanitize(value);
}

function urlByRole(role: string): string | null {
  if (!role) return null;
  const r = role.toLowerCase();
  const map: Record<string, string | undefined> = {
    owner: process.env.GHL_WEBHOOK_OWNER,
    operator: process.env.GHL_WEBHOOK_OPERATOR,
    coach: process.env.GHL_WEBHOOK_COACH,
    waitlist: process.env.GHL_WEBHOOK_WAITLIST,
  };
  const url = map[r] || process.env.GHL_WEBHOOK_DEFAULT;
  return url ?? null;
}

