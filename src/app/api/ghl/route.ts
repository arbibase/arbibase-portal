import { NextResponse } from "next/server";

// main GET is defined later to support CORS and request handling

const allowedOrigins = [
  "https://arbibase.com",
  "https://www.arbibase.com",
  "https://papayawhip-cod-416996.hostingersite.com", // your current WP/Hostinger site
  "https://www.papayawhip-cod-416996.hostingersite.com",
  "https://arbibase-portal.vercel.app",
  "http://localhost:3000"               // optional, for testing
];

const DEFAULT_ALLOWED = [
  "https://arbibase.com",
  "https://www.arbibase.com",
  // add your Hostinger preview domain(s) if you use them during testing:
  "https://*.hostingersite.com",
  "http://localhost:3000",
];

function cors(res: NextResponse, origin: string | null) {
  const allowList = (Array.isArray(allowedOrigins) && allowedOrigins.length) ? allowedOrigins : DEFAULT_ALLOWED;
  const allow = (origin && allowList.includes(origin)) ? origin : allowList[0];
  res.headers.set("Access-Control-Allow-Origin", allow);
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Max-Age", "86400");
  res.headers.set("Vary", "Origin");
  return res;
}
export async function OPTIONS(req: Request) {
  return cors(new NextResponse(null, { status: 204 }), req.headers.get("origin"));
}

function norm(v: unknown) { return typeof v === "string" ? v.trim() : ""; }
function roleToWebhook(role?: string) {
  const r = norm(role).toLowerCase();
  if (r === "owner")    return process.env.GHL_WEBHOOK_OWNER;
  if (r === "operator") return process.env.GHL_WEBHOOK_OPERATOR;
  if (r === "coach")    return process.env.GHL_WEBHOOK_COACH;
  return "";
}
function roleToContactType(role?: string) {
  const r = norm(role).toLowerCase();
  if (r === "owner")    return "Landlord";
  if (r === "operator") return "Operator";
  if (r === "coach")    return "Coach";
  return "";
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, any>;

    // honeypot
    if (norm(b.website)) {
      return cors(NextResponse.json({ ok: true, spam: true }), origin);
    }

    const hook = roleToWebhook(b.role);
    if (!hook) {
      return cors(
        NextResponse.json({ ok: false, error: `Missing/invalid role.` }, { status: 400 }),
        origin
      );
    }

    const first = norm(b.first_name);
    const last  = norm(b.last_name);

    // Build a payload that covers standard fields + your labeled customs
    const payload: any = {
      // Standard contact properties GHL accepts
      name: [first, last].filter(Boolean).join(" "),
      firstName: first,
      lastName: last,
      email: norm(b.email),
      phone: norm(b.phone),
      source: process.env.GHL_WAITLIST_SOURCE || "PreLaunch",
      type: roleToContactType(b.role),

      // Owner address (standard fields)
      address1: norm(b.address1),
      city:     norm(b.city),
      state:    norm(b.state),
      postalCode: norm(b.postal_code),

      // Some systems also look at "website" for the website field;
      // we use a separate "website_coach" input to avoid the honeypot.
      website: norm(b.website_coach),

      // Duplicate into custom_fields with your exact labels where relevant
      custom_fields: {
        // Owner-specific
        "Willing to allow STR/MTR?": norm(b.willing_to_allow_strmtr),
        "Preferred Lease Term": norm(b.preferred_lease_term),
        "Notes - Building rules, HOA notes, etc.": norm(b.notes__building_rules_hoa_notes_etc),

        // Operator-specific
        "Markets": norm(b.markets),
        "Experience Level": norm(b.experience_level),
        "Approval Preference": norm(b.approval_preference),
        "How did you hear about us?": norm(b.how_did_you_hear_about_us),

        // Coach-specific
        "Program/Brand Name - Coach": norm(b.program_brand),
      },

      // Business Name (standard) for coach
      companyName: norm(b.company_name),

      // helpful metadata
      headers: {
        referer: req.headers.get("referer") || "",
        "user-agent": req.headers.get("user-agent") || "",
        page: norm(b.page),
        consent: (b.consent === true || b.consent === "Yes") ? "Yes" : "No",
      },
    };

    const gh = await fetch(hook, {
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
        ),
        origin
      );
    }

    return cors(NextResponse.json({ ok: true }), origin);
  } catch (err: any) {
    return cors(
      NextResponse.json({ ok: false, error: err?.message || "Unhandled server error" }, { status: 500 }),
      origin
    );
  }
}