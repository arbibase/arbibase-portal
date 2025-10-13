import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_ALLOWED = [
  'https://arbibase.com',
  'https://www.arbibase.com',
  'https://arbibase-portal.vercel.app',
  'http://localhost:3000',
];

function getAllowedOrigins() {
  const env = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return env.length ? env : DEFAULT_ALLOWED;
}

function pickAllowOrigin(origin: string | undefined) {
  if (!origin) return getAllowedOrigins()[0];
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return origin;
  // simple wildcard support like https://*.hostingersite.com
  const ok = allowed.find(a => a.endsWith('*') && origin.startsWith(a.slice(0, -1)));
  return ok ? origin : allowed[0];
}

function withCORS(res: NextApiResponse, origin?: string) {
  const allow = pickAllowOrigin(origin);
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function urlByRole(role?: string) {
  const r = (role || '').toLowerCase();
  if (r === 'owner')    return process.env.GHL_WEBHOOK_OWNER;
  if (r === 'operator') return process.env.GHL_WEBHOOK_OPERATOR;
  if (r === 'coach')    return process.env.GHL_WEBHOOK_COACH;
  return undefined;
}

function s(v: unknown) { return typeof v === 'string' ? v.trim() : ''; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string | undefined;
  withCORS(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(204).end(); // preflight OK
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, route: '/api/ghl' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'object' ? req.body : {};
    // honeypot
    if (body.website && String(body.website).trim().length > 0) {
      res.status(200).json({ ok: true, spam: true });
      return;
    }

    const role = s(body.role);
    const target = urlByRole(role);
    if (!target) {
      res.status(400).json({ ok: false, error: `Missing or invalid role: "${role}"` });
      return;
    }

    // NOTE: this is the generic payload we forward to GHL webhooks.
    // You’ll map these to GHL contact fields on the webhook side.
    const payload = {
      role,
      // universal contact
      first_name: s(body.first_name),
      last_name: s(body.last_name),
      name: [s(body.first_name), s(body.last_name)].filter(Boolean).join(' ').trim(), // convenience
      email: s(body.email),
      phone: s(body.phone),
      consent: !!body.consent,
      source: process.env.GHL_WAITLIST_SOURCE || 'PreLaunch',
      page: s(body.page) || (req.headers.referer as string) || '',

      // owner address (split)
      address1: s(body.address1),
      city: s(body.city),
      state: s(body.state),
      postal_code: s(body.postal_code),

      // owner specific
      approval: s(body.approval),
      lease_term: s(body.lease_term),
      notes: s(body.notes),

      // operator specific
      markets: s(body.markets),
      experience_level: s(body.experience_level),
      approval_preference: s(body.approval_preference),

      // coach specific
      program_brand: s(body.program_brand),
      company_name: s(body.company_name),
      website: s(body.website_or_social),

      // FYI: we dropped UTMs since you said GHL doesn’t use them
      submitted_at: new Date().toISOString(),
    };

    const gh = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!gh.ok) {
      const text = await gh.text().catch(() => '');
      res.status(502).json({ ok: false, error: `GHL webhook: ${text}` });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Unhandled server error' });
  }
}
