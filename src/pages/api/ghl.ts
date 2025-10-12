// src/pages/api/ghl.ts
import type { NextApiRequest, NextApiResponse } from "next";

// --- CORS ---
const ALLOWED = [
  "https://arbibase.com",
  "https://www.arbibase.com",
  "https://papayawhip-cod-416996.hostingersite.com",
  "https://www.papayawhip-cod-416996.hostingersite.com",
  "https://arbibase-portal.vercel.app",
  "http://localhost:3000",
] as const;

function withCORS(res: NextApiResponse, origin?: string) {
  const allowOrigin =
    origin && ALLOWED.some(a => origin === a)
      ? origin
      : ALLOWED[0];
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// --- Role → Webhook ---
const S = (v: unknown) => (typeof v === "string" ? v.trim() : "");
function urlByRole(role?: string) {
  switch ((role || "").toLowerCase()) {
    case "owner":    return process.env.GHL_WEBHOOK_OWNER;
    case "operator": return process.env.GHL_WEBHOOK_OPERATOR;
    case "coach":    return process.env.GHL_WEBHOOK_COACH;
    default: return undefined;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  withCORS(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({ ok: true, where: "pages api", route: "/api/ghl" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const b: any = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // honeypot
    if (b?.website) {
      res.status(200).json({ ok: true, spam: true });
      return;
    }

    const role = S(b.role);
    const target = urlByRole(role);
    if (!target) {
      res.status(400).json({ ok: false, error: `Missing or invalid role: "${role}"` });
      return;
    }

    // Minimal pass-through body (you can keep your richer mapping later)
    const payload = { ...b, submitted_at: new Date().toISOString() };

    const gh = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!gh.ok) {
      const text = await gh.text().catch(() => "");
      res.status(502).json({ ok: false, error: `GHL webhook ${gh.status}: ${text || gh.statusText}` });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || "Unhandled server error" });
  }
}
