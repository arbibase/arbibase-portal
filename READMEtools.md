# 🧠 ArbiBase — System Architecture & Data Flow Documentation

### Overview
ArbiBase is the first **Verified Property Layer for Rental Arbitrage** — a platform that connects operators, owners, and investors with verified STR/MTR-friendly properties across the United States.

This document outlines the internal data architecture, integrations, and operational logic for all major tools and services.

---

## 🧩 Platform Overview

### Core Tooling
| Category | Purpose |
|-----------|----------|
| **Revenue Estimator** | Quick viability check for new properties |
| **ROI Calculator** | Deeper investment and profitability analysis |
| **Market Dashboard** | Market-level insights and risk metrics |
| **Portfolio Analytics** | Performance tracking for all properties |
| **ArbiBase Library** | Legal & compliance resource center |
| **Messaging** | Owner↔Operator secure communication |
| **Personal AI Assistant** | Multi-agent AI for analysis, drafting & negotiation |
| **AI Chat Assistant** | Customer, technical, and billing support |
| **Concierge Sourcing** | White-glove property sourcing for verified Premium users |
| **Verified Operator (KYC)** | Identity and trust verification system |
| **Data / API Access** | External integration endpoints (Premium) |

---

## ⚙️ High-Level Data Flow Architecture

```mermaid
flowchart LR
  subgraph FE[Next.js Frontend]
    UI_Est[Revenue Estimator]
    UI_ROI[ROI Calculator]
    UI_Market[Market Dashboard]
    UI_Portfolio[Portfolio Analytics]
    UI_Library[ArbiBase Library]
    UI_Msg[In-App Messaging]
    UI_AI[Personal AI Assistant]
    UI_Support[AI Chat Assistant]
  end

  subgraph BE[Supabase Backend + Edge Services]
    API_GW[API Gateway / tRPC]
    AUTH[Auth & RBAC]
    EST[Estimator Service]
    ROI[ROI Service]
    MRK[Market Service]
    LIB[Library Service]
    MSG[Messaging Service]
    PORT[Portfolio Service]
    AI_SVC[AI Orchestrator]
    BILL[Billing Service]
    KYC[Verification]
    ADMIN[Admin Panel]
    EVENTS[(Event Bus)]
    CACHE[(Redis / Edge Cache)]
    DW[(Analytics Warehouse)]
  end

  subgraph EXT[External Providers]
    MAP[Mapbox]
    PRICING[Market Data APIs]
    LLM[LLM Provider]
    IDV[KYC / ID Verification]
    PAY[Payment Gateway]
    WEBHOOKS[Client Integrations]
  end

  FE -->|mutations / queries| API_GW
  API_GW --> AUTH
  API_GW --> EST
  API_GW --> ROI
  API_GW --> MRK
  API_GW --> LIB
  API_GW --> MSG
  API_GW --> PORT
  API_GW --> AI_SVC
  API_GW --> BILL
  API_GW --> KYC
  API_GW --> ADMIN

  MRK -->|fetch/cache| PRICING
  EST --> MRK
  ROI --> MRK
  LIB --> ADMIN
  AI_SVC --> LLM
  KYC --> IDV
  BILL --> PAY

  MRK <-->|read/write| CACHE
  EST <-->|read/write| CACHE
  ROI <-->|read/write| CACHE

  BE <--> DW
  EVENTS <-->|publish/subscribe| EST
  EVENTS <-->|publish/subscribe| ROI
  EVENTS <-->|publish/subscribe| PORT
  EVENTS <-->|publish/subscribe| MSG
  EVENTS <-->|publish/subscribe| LIB
  EVENTS <-->|publish/subscribe| MRK
  EVENTS --> JOBS

  PORT --> WEBHOOKS

🔄 Event Topics
property.estimated → payload: estimate_id, property_id, summary → consumed by ROI, Portfolio

roi.computed → payload: roi_id, property_id, KPIs → consumed by Portfolio, Market (benchmarks)

portfolio.property.saved → payload: property_id, user, tags → consumed by Messaging (thread bootstrap), AI (tips)

market.snapshot.updated → payload: city/zip, ADR/Occ, risk → consumed by Estimator/ROI (recalc flags)

library.regulation.updated → payload: region, risk → consumed by Market (risk score), Estimator (warning)

messaging.thread.updated → payload: thread_id, status → consumed by Portfolio (deal stage)

kyc.verified → payload: operator_id, level → consumed by Messaging, Concierge gate

billing.plan.changed → payload: user_id, tier → consumed by feature flags across services

🗃️ Supabase Core Schema (tables & essential fields)

users

id (uuid PK), email, tier (enum: beta|pro|premium), created_at

operators

id (uuid PK), user_id FK, company, markets[], units_managed

kyc_verifications

id, operator_id FK, status (pending|approved|enhanced), evidence_urls[], verified_at

properties

id, user_id FK, address, city, state, zip, type, beds, baths, sqft, status (prospect|negotiation|live|archived)

market_snapshots

id, geo_key (zip/cbg), adr, occ, lt_rent, risk_score, seasonality_index, as_of

revenue_estimates

id, property_id FK, inputs (jsonb), assumptions (jsonb), gross_rev, expenses, net_profit, roi_basic, viability_score, created_at

roi_analyses

id, property_id FK, inputs (jsonb), coc, payback_months, annual_roi, five_year_profit, sensitivity (jsonb), created_at

portfolio_properties

id, user_id FK, property_id FK, stage (saved|verified|live), notes, tags[]

portfolio_kpis_monthly

id, property_id FK, month, gross_rev, expenses, net_profit, occ_rate, roi_pct, trend (up|flat|down)

messages_threads

id, property_id FK, owner_contact, status (open|pending|closed), last_activity_at

messages

id, thread_id FK, sender (owner|operator|system), body, attachments[], created_at

library_regions

id, state, county, city, regulation (allowed|conditional|restricted), permits[], taxes[], last_update

library_clauses

id, jurisdiction_key, title, body_md, tags[], version

concierge_requests

id, operator_id FK, criteria (jsonb), status (queued|matched|closed), matches_count, created_at

ai_jobs

id, type (analysis|copy|clause|negotiation), input (jsonb), output (jsonb), latency_ms, created_at

support_tickets

id, user_id, type (billing|tech|other), status, sla_due_at

subscriptions

id, user_id, provider, plan, status, renew_at

api_keys

id, user_id, label, scope, revoked, last_used_at

webhook_endpoints

id, user_id, url, events[], active

audit_log

id, actor_id, action, target, metadata (jsonb), created_at

📦 Data Contracts (JSON)

RevenueEstimatorRequest

{
  "propertyId": "uuid-or-null",
  "location": {"city": "Dallas", "state": "TX", "zip": "75204"},
  "home": {"type": "apartment", "beds": 2, "baths": 2, "sqft": 980},
  "lease": {"monthlyRent": 2100, "termMonths": 12},
  "ops": {"cleaningPerTurn": 70, "utilitiesMonthly": 250, "mgmtPct": 0.15},
  "assumptions": {"adr": 165, "occ": 0.74, "seasonalityIndex": 1.03, "mode": "STR"}
}


RevenueEstimatorResult

{
  "estimateId": "uuid",
  "propertyId": "uuid",
  "grossMonthlyRevenue": 3728.00,
  "operatingExpenses": 1120.00,
  "netMonthlyProfit": 2608.00,
  "roiBasicPct": 14.2,
  "breakEvenOccPct": 0.48,
  "viabilityScore": 82,
  "warnings": ["Permit likely required"]
}


ROICalcRequest

{
  "propertyId": "uuid",
  "initialCosts": {"furniture": 7000, "deposit": 2100, "setupMisc": 800},
  "lease": {"monthlyRent": 2100, "termMonths": 12},
  "ops": {"cleaningPerTurn": 70, "utilitiesMonthly": 250, "mgmtPct": 0.15},
  "revenueAssumptions": {"adr": 165, "occ": 0.74},
  "scenarios": [{"name":"Base"}, {"name":"Conservative","adr":150,"occ":0.68}]
}


ROICalcResult

{
  "roiId": "uuid",
  "cocPct": 22.8,
  "paybackMonths": 7,
  "annualRoiPct": 38.4,
  "fiveYearProfit": 93600,
  "scenarioTable": [
    {"name":"Base","cocPct":22.8,"annualRoiPct":38.4},
    {"name":"Conservative","cocPct":17.2,"annualRoiPct":29.0}
  ]
}


PortfolioKpiUpsert

{
  "propertyId": "uuid",
  "month": "2025-10",
  "grossRevenue": 4120,
  "expenses": 1510,
  "netProfit": 2610,
  "occRate": 0.76
}
🧵 Sequence Diagrams
1) Prospect → Estimator → ROI → Save to Portfolio
sequenceDiagram
  participant U as User (Operator)
  participant FE as Next.js UI
  participant EST as Estimator Svc
  participant ROI as ROI Svc
  participant PORT as Portfolio Svc
  participant EV as Event Bus

  U->>FE: Enter address + costs
  FE->>EST: POST /estimate (request)
  EST-->>FE: estimate result (net, score)
  FE->>ROI: POST /roi (prefilled from estimate)
  ROI-->>FE: roi result (coc, payback)
  U->>FE: Save Property
  FE->>PORT: POST /portfolio/save
  PORT-->>FE: ok + KPIs
  EST-->>EV: publish property.estimated
  ROI-->>EV: publish roi.computed
  EV-->>PORT: consume events → enrich KPIs

2) Messaging with Owner + AI Negotiation + Library Attachment
sequenceDiagram
  participant U as Operator
  participant MSG as Messaging Svc
  participant AI as Personal AI
  participant LIB as Library Svc
  participant FE as UI

  U->>MSG: Open thread / Send message
  MSG-->>FE: Thread updated
  U->>AI: "Draft counter-offer"
  AI-->>FE: Suggested reply text
  U->>LIB: Search "Texas sublease addendum"
  LIB-->>FE: Template + clause bundle
  U->>MSG: Send reply + attach addendum
  MSG-->>FE: Thread status: pending→open

3) Market Data Refresh → Cached → Recompute Flags
sequenceDiagram
  participant CRON as Jobs
  participant MRK as Market Svc
  participant CACHE as Redis/Edge
  participant EV as Event Bus
  participant EST as Estimator
  participant ROI as ROI

  CRON->>MRK: Fetch latest ADR/Occ per ZIP
  MRK->>CACHE: Upsert market_snapshots
  MRK-->>EV: publish market.snapshot.updated
  EV-->>EST: mark impacted estimates stale
  EV-->>ROI: mark impacted roi analyses stale
🔐 Security & PII Boundaries

RBAC per tier: Beta/Pro/Premium gates at API layer + row-level policies in Supabase.

KYC: PII (IDs, docs) stored encrypted at rest, S3-compatible bucket with signed URLs, short TTL.

Messaging attachments: Virus scanning on upload; access scoped to thread participants.

Audit logging: All data exports, API key usage, and permission changes logged to audit_log.

Secrets isolation: LLM, IDV, Payment keys stored in server-only environment; never exposed to client.

⚡ Performance & Caching
Service	Avg. Latency	Cache TTL	Notes
Estimator	300 ms (warm)	30 min	Memoized per property hash
ROI Calculator	1.2 s	1 h	Includes sensitivity table
Market Dashboard	400 ms	6 h	Region-level snapshots
AI Jobs	< 8 s	N/A	Streamed partial responses

🧰 Developer Setup
Clone Repository

bash
Copy code
git clone https://github.com/arbibase/arbibase-portal.git
cd arbibase-portal
Environment Variables

SUPABASE_URL, SUPABASE_SERVICE_KEY

REDIS_URL

OPENAI_API_KEY (or LLM provider)

MAPBOX_TOKEN

STRIPE_KEY or equivalent

Run Local

bash
Copy code
pnpm install
pnpm dev
Docs & Linting

bash
Copy code
pnpm run docs
pnpm run lint
🧠 Contributing
Use feature branches prefixed with feature/ or fix/.

All PRs must include an updated CHANGELOG.md entry.

Add new tables or endpoints to this README under respective sections.

🧭 Contact
Technical Lead: Daniel Arotoma

Founder / Product: Christopher Larico Vargas

Docs Maintainer: ArbiBase Engineering

© 2025 ArbiBase — The Verified Property Layer for Arbitrage.
