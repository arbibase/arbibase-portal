import { NextResponse } from "next/server";

const allowedOrigins = [
  "https://arbibase.com",
  "https://www.arbibase.com",
  "https://papayawhip-cod-416996.hostingersite.com",
];

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", allowedOrigins.join(","));
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

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

    if (body.website && String(body.website).trim().length > 0) {
      return cors(NextResponse.json({ ok: true, spam: true }));
    }

    const role = sanitizeString(body.role);
    const target = urlByRole(role);
    if (!target) {
      return cors(
        NextResponse.json(
          { ok: false, error: `Missing or invalid role: "${role}"` },
          { status: 400 }
        )
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
      property_address: sanitizeString(body.address),
      approval: sanitizeString(body.approval),
      lease_term: sanitizeString(body.lease_term),
      notes: sanitizeString(body.notes),
      markets: sanitizeString(body.markets),
      experience_level: sanitizeString(body.experience),
      budget: sanitizeString(body.budget),
      approval_preference: sanitizeString(body.approval_preference),
      program: sanitizeString(body.program),
      audience_size: sanitizeString(body.audience_size),
      website_or_social: sanitizeString(body.website),
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
      return cors(
        NextResponse.json(
          { ok: false, error: `GHL webhook ${gh.status}: ${text || gh.statusText}` },
          { status: 502 }
        )
      );
    }

    return cors(NextResponse.json({ ok: true }));
  } catch (err: any) {
    return cors(
      NextResponse.json(
        { ok: false, error: err?.message || "Unhandled server error" },
        { status: 500 }
      )
    );
  }
}
