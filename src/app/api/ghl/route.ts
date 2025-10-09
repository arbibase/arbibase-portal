import { NextResponse } from "next/server";

const allowedOrigins = [
  "https://arbibase.com",
  "https://www.arbibase.com",
  "https://papayawhip-cod-416996.hostingersite.com,https://arbibase.ai,https://arbibase-portal.vercel.app",
].map(s => s.trim());

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  } as Record<string, string>;
}
/* -------------------------- */

function urlByRole(role?: string) {
  const r = (role || "").toLowerCase();
  if (r === "owner")    return process.env.GHL_WEBHOOK_OWNER;
  if (r === "operator") return process.env.GHL_WEBHOOK_OPERATOR;
  if (r === "coach")    return process.env.GHL_WEBHOOK_COACH;
  return undefined;
}

function sanitizeString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // honeypot
    if (body.website && String(body.website).trim().length > 0) {
      return NextResponse.json({ ok: true, spam: true }, { headers: corsHeaders(req) });
    }

    const role = sanitizeString(body.role);
    const target = urlByRole(role);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: `Missing or invalid role: "${role}"` },
        { status: 400, headers: corsHeaders(req) }
      );
    }

    const payload = {
      role,
      name: sanitizeString(body.name),
      email: sanitizeString(body.email),
      phone: sanitizeString(body.phone),
      consent: !!body.consent,
      source: process.env.GHL_WAITLIST_SOURCE || "PreLaunch",
      page: sanitizeString(body.page) || req.headers.get("referer") || "",

      // owner
      property_address: sanitizeString(body.property_address),
      approval: sanitizeString(body.approval),
      lease_term: sanitizeString(body.lease_term),
      notes: sanitizeString(body.notes),

      // operator
      markets: sanitizeString(body.markets),
      experience_level: sanitizeString(body.experience_level),
      budget: sanitizeString(body.budget),
      approval_preference: sanitizeString(body.approval_preference),

      // coach
      program: sanitizeString(body.program),
      audience_size: sanitizeString(body.audience_size),
      website_or_social: sanitizeString(body.website_or_social),

      // UTM
      utm_source: sanitizeString(body.utm_source),
      utm_medium: sanitizeString(body.utm_medium),
      utm_campaign: sanitizeString(body.utm_campaign),
      utm_term: sanitizeString(body.utm_term),
      utm_content: sanitizeString(body.utm_content),

      submitted_at: new Date().toISOString(),
    };

    const gh = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!gh.ok) {
      const text = await gh.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `GHL webhook ${gh.status}: ${text || gh.statusText}` },
        { status: 502, headers: corsHeaders(req) }
      );
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders(req) });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unhandled server error" },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}