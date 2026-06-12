# Xeno Mini CRM

An AI-assisted marketing CRM built for the **Xeno SDE Internship Assignment**.

The application models customer segmentation, campaign execution, asynchronous delivery tracking, and AI-powered campaign insights using a fictional retail brand called **Brew & Co.**

Combines **LLM-assisted segmentation** (Groq) with **deterministic campaign generation logic** (strategy, copy, and launch-time personalization) — not a fully LLM-driven pipeline.

**Status:** Developed and tested locally. Not deployed to production. No authentication, no automated tests.

---

## Highlights

- Built a full-stack CRM using Next.js, Prisma, PostgreSQL, and TypeScript.
- Designed an asynchronous webhook-driven delivery simulator using Express.
- Integrated Groq and Gemini for AI-assisted segmentation and campaign insights.
- Implemented service-layer architecture and campaign attribution logic.

---

## Project Overview

This repository contains two cooperating applications:

| App | Path | Role |
|-----|------|------|
| **CRM** | `crm/` | Next.js UI, REST API, PostgreSQL via Prisma, AI-assisted campaign workflow |
| **Channel Service** | `channel-service/` | Express-based **delivery simulator** (not a real SMS/email/WhatsApp provider) |

The CRM handles customer data, segmentation, campaign creation, and analytics. The channel service accepts send requests, simulates probabilistic delivery lifecycles, and POSTs status webhooks back to the CRM. Conversions can trigger simulated orders with campaign attribution.

**Skills highlighted:** full-stack TypeScript, service-layer architecture, Prisma data modeling, REST + webhook integration, hybrid AI (LLM + deterministic logic), and pragmatic trade-offs for an assignment scope.

---

## Problem Statement

Small retail teams struggle to:

- Turn business goals into actionable audience filters
- Personalize outreach at scale across email, SMS, and WhatsApp
- Measure campaign performance beyond a simple “send” count

This project models an end-to-end workflow: **customer data → segmentation → campaign execution → simulated delivery → conversion tracking → AI-assisted insights**.

---

## Features

| Area | What it does | Key implementation |
|------|--------------|-------------------|
| **Dashboard** | KPIs, sales by store location, recent campaigns and orders | `crm/app/page.tsx`, `GET /api/dashboard/stats` |
| **Customers** | Search, pagination, CSV import | `crm/app/customers/page.tsx`, `CustomerService` |
| **Orders** | List orders with campaign attribution; CSV import | `OrderService` (7-day attribution window) |
| **Segments** | AI-assisted or manual rule builder with live audience preview | `SegmentEngine`, `POST /api/segments/ai` |
| **AI Autopilot** | LLM-assisted segmentation + deterministic strategy/copy → draft campaign | `AgentOrchestrator`, `POST /api/campaigns/generate` |
| **Campaign launch** | Personalize messages, dispatch to channel simulator | `CampaignSender`, `POST /api/campaigns/[id]/launch` |
| **Funnel updates** | Polling-based delivery stats while a campaign is sending | SWR `refreshInterval: 2500` in `useCampaign` (`crm/hooks/use-campaigns.ts`) |
| **AI insights** | Post-campaign summary and next-step suggestion | `insights.service.ts` (Gemini when configured; programmatic fallback otherwise) |
| **Agent transparency** | Visible reasoning timeline for AI steps | `AgentThoughtsTimeline` component |

**Seed data** (`npx prisma db seed` in `crm/`): creates **500 customers**, **2,000+ orders**, and **4 sample segments** per `crm/prisma/seed.ts`.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React 19 + SWR)                       │
│              crm/app/ — Dashboard, Campaigns, Segments             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP /api/*
┌────────────────────────────▼────────────────────────────────────┐
│                  CRM — Next.js 15 (crm/)                         │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ API Routes   │ → │ Services     │ → │ Prisma 7 + pg      │  │
│  │ app/api/*    │   │ services/*   │   │ lib/prisma.ts      │  │
│  └──────────────┘   │ ai/*         │   └─────────┬──────────┘  │
│                     └──────┬───────┘             │              │
│                            │                     ▼              │
│                     Groq (segmentation)    PostgreSQL           │
│                     Gemini (insights)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/send
┌────────────────────────────▼────────────────────────────────────┐
│           Channel Service — Express 5 (channel-service/)           │
│   Probabilistic state machine → async webhook callbacks            │
└────────────────────────────┬───────────────────────────────────────┘
                             │ POST /api/webhooks/receipt
                             ▼
                    ReceiptService → OrderService (on conversion)
```

**Style:** Layered monolith (CRM) + auxiliary HTTP service (channel simulator) with async webhook callbacks.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15.5, React 19, Tailwind CSS 4, shadcn/ui, SWR, Recharts |
| Backend | Next.js API Route Handlers (`crm/app/api/`) |
| Database | PostgreSQL (compatible with Supabase; configured via `DATABASE_URL`) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| AI — Segmentation | Groq API, Llama 3.3 70B (`crm/lib/groq.ts`) |
| AI — Insights | Google Gemini 2.5 Pro (`crm/lib/gemini-insights.ts`) |
| AI — Strategy & copy | Deterministic heuristics + regex parser (`crm/ai/strategy.ts`, `crm/ai/local-nlp-parser.ts`) |
| Validation | Zod (`crm/ai/schemas.ts`) |
| Channel simulator | Express 5, TypeScript (`channel-service/`) |

---

## Setup Instructions

Tested locally with two terminals (CRM on port 3000, channel service on port 3001).

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted)
- [Groq API key](https://console.groq.com/) — required for AI segmentation and Autopilot
- [Google Gemini API key](https://aistudio.google.com/) — optional; insights use a programmatic fallback without it

### 1. Clone and install

```bash
git clone <repo-url>
cd xeno-mini-crm
```

### 2. CRM (`crm/`)

```bash
cd crm
cp ../.env.example .env   # or create .env manually — see Environment Variables
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev               # http://localhost:3000
```

### 3. Channel Service (`channel-service/`) — separate terminal

```bash
cd channel-service
cp .env.example .env
npm install
npm run dev               # http://localhost:3001
```

Both services must be running for campaign launch and funnel polling to work.

### Build (local verification)

```bash
# CRM
cd crm && npm run build && npm start

# Channel Service
cd channel-service && npm run build && npm start
```

---

## Environment Variables

### CRM (`crm/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (runtime) |
| `DIRECT_URL` | Recommended | Direct connection for Prisma migrations |
| `GROQ_API_KEY` | Yes | Segmentation and Autopilot (`crm/lib/groq.ts`) |
| `GEMINI_API_KEY` | No | Campaign insights; programmatic fallback if missing |
| `CHANNEL_SERVICE_URL` | No | Default: `http://localhost:3001` |
| `CRM_WEBHOOK_URL` | No | Default: `http://localhost:3000/api/webhooks/receipt` |

### Channel Service (`channel-service/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No | Default: `3001` |
| `CRM_WEBHOOK_URL` | No | Where delivery status callbacks are POSTed |

See `.env.example` at the repo root for a combined template. Note: `GROQ_API_KEY` is required by the code but is not yet listed in that file — add it to `crm/.env` manually.

---

## Campaign / Data Flow

```
1. IMPORT     CSV upload or prisma db seed → customers + orders in PostgreSQL
2. SEGMENT    Natural-language prompt or manual rules → SegmentEngine → JSON rules → SQL filters
3. GENERATE   POST /api/campaigns/generate
              → Groq segmentation (with self-correction if 0 matches)
              → deterministic strategy + local NLP copy
              → draft Campaign + Segment saved
4. LAUNCH     POST /api/campaigns/[id]/launch
              → resolve audience → personalize [Name], [City], etc.
              → create Communication per customer
              → POST channel-service /api/send (batches of 20)
5. SIMULATE   Channel service: queued → sent → delivered → opened/read → clicked → converted
              → webhook POST /api/webhooks/receipt per transition
6. ATTRIBUT   ReceiptService enforces forward-only status updates
              → "converted" triggers OrderService.create (₹500–₹2500 simulated order)
              → 7-day campaign attribution on orders
7. ANALYZE    Campaign page polls stats; GET /api/campaigns/[id]/insights
              → Gemini narrative or programmatic fallback
```

---

## Design Decisions and Trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| **Next.js full-stack** | Single codebase for UI + API; straightforward local dev | Large campaign launches run inside the API request lifecycle |
| **Separate channel service** | Demonstrates async provider + webhook pattern | Two processes to run locally; more moving parts |
| **Groq for segmentation, Gemini for insights** | Split in `lib/groq.ts` vs `lib/gemini-insights.ts` | Two external API keys when using both features |
| **Deterministic strategy/copy** | `ai/strategy.ts` and `local-nlp-parser.ts` avoid LLM calls at launch time | Less flexible than a fully LLM-driven pipeline |
| **Denormalized customer fields** | `totalSpent`, `totalOrders`, `lastOrderAt` speed up `SegmentEngine` queries | Must stay in sync on order create |
| **JSON `stats` on campaigns** | Stores funnel counts + AI metadata without schema migrations | Weaker compile-time guarantees |
| **SWR polling (2.5s)** | Simple funnel updates during `sending` status | More HTTP requests than WebSockets or SSE |
| **Debounced stats sync (1.5s)** | `CampaignService.queueSyncStats` reduces DB writes during webhook bursts | Stats can be briefly stale |
| **In-memory insight cache** | Avoids redundant Gemini calls during polling | Not shared across server instances or cold starts |
| **No authentication** | Scoped out of the assignment to focus on CRM workflow | All routes are public; not safe for real PII |

---

## Demo

> **Not recorded yet.** Placeholders below for a future walkthrough GIF or short video.

| Asset | Description |
|-------|-------------|
| `docs/demo/autopilot-flow.gif` | Goal entry → Autopilot generate → launch → funnel updates |
| `docs/demo/segment-builder.gif` | AI segment compile + live audience preview |
| `docs/demo/full-walkthrough.mp4` | End-to-end local demo (optional narrated version) |

**Suggested local demo path:**

1. `npx prisma db seed` → open Dashboard
2. `/campaigns/new` → enter a goal (e.g. win-back dormant Mumbai customers) → Generate → Launch
3. Open campaign analytics → observe polling-based funnel updates while channel service runs
4. `/segments/new` → manual rules or AI compile → save segment

---

## Screenshots

> **Not added yet.** Placeholders for future images.

| Screen | Path | Description |
|--------|------|-------------|
| Dashboard | `docs/screenshots/dashboard.png` | KPIs and location sales chart |
| Autopilot | `docs/screenshots/autopilot.png` | Campaign workspace with agent thoughts timeline |
| Funnel | `docs/screenshots/funnel.png` | Delivery funnel during simulated send |
| Segments | `docs/screenshots/segments.png` | Segment builder with audience preview |

---

## Deployment Status

**Not deployed.** The project has been run and verified **locally only**. There is no Docker, CI/CD, or hosting configuration in the repository.

If deployed in the future, a plausible split would be:

| Component | Candidate host | Constraint |
|-----------|----------------|------------|
| CRM | Vercel or similar | Set all `crm/.env` variables; watch serverless timeouts on large launches |
| Channel Service | Railway, Fly.io, or similar **long-running** host | Simulation uses `setTimeout` chains — poor fit for short-lived serverless |
| Database | Hosted PostgreSQL (e.g. Supabase) | Use pooled `DATABASE_URL` + `DIRECT_URL` for migrations |

Cross-service env wiring would require public URLs for `CHANNEL_SERVICE_URL`, `CRM_WEBHOOK_URL`, and reciprocal webhook reachability. None of this has been implemented or tested beyond local development.

---

## Assumptions and Limitations

- **Assignment scope** — focuses on CRM workflow, simulated delivery, and AI-assisted campaign creation
- **Local development only** — not deployed; not validated in a production environment
- **No authentication or authorization** — all pages and API routes are open
- **Simulated messaging** — channel service does not integrate with real email, SMS, or WhatsApp providers
- **No automated tests** — no unit, integration, or E2E test files in the repository
- **No CI/CD or Docker** — manual install, migrate, seed, and run
- **Synchronous launch API** — `CampaignSender.launch` awaits dispatch; large segments load all recipients into memory
- **Unsigned webhooks** — `/api/webhooks/receipt` accepts callbacks without signature verification
- **External AI dependencies** — Groq required for segmentation/Autopilot; Gemini optional for narrative insights

---

## Future Improvements

1. **Authentication** — protect API routes and pages
2. **Webhook signing** — shared secret between channel service and CRM
3. **Automated tests** — prioritize `SegmentEngine` and `ReceiptService`
4. **Background job queue** — decouple campaign launch from the HTTP response
5. **Database indexes** — on segment filter columns (`city`, `totalSpent`, `lastOrderAt`)
6. **Shared types package** — unify payloads between CRM and channel-service
7. **Real channel integrations** — replace simulator with provider SDKs (SendGrid, Twilio, etc.)
8. **Deployment pipeline** — Docker, CI, and hosted demo environment
9. **Demo assets** — screenshots and walkthrough video for reviewers

---

## Folder Structure

```
xeno-mini-crm/
├── README.md
├── .env.example
├── crm/                          # Next.js CRM application
│   ├── app/                      # Pages + API routes
│   │   ├── api/                  # Route handlers (customers, orders, segments, campaigns, webhooks)
│   │   ├── campaigns/            # List, Autopilot, analytics
│   │   ├── customers/
│   │   ├── segments/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Dashboard
│   ├── ai/                       # Segmentation, strategy, content agents + prompts
│   ├── components/               # Layout, UI primitives, AgentThoughtsTimeline
│   ├── hooks/                    # SWR hooks (customers, campaigns, segments)
│   ├── lib/                      # Prisma, Groq, Gemini insights, CSV parser
│   ├── services/                 # Business logic (9 modules under services/)
│   ├── prisma/                   # schema.prisma (5 models), migrations, seed.ts
│   └── types/                    # Shared TypeScript interfaces
└── channel-service/              # Express delivery simulator
    └── src/
        ├── controllers/
        ├── simulation/           # State machine, probabilities, callbacks
        ├── routes/
        └── types/
```

---

## Why This Project Demonstrates SDE Skills

| Skill | Evidence in codebase |
|-------|---------------------|
| **Full-stack delivery** | Next.js UI, CRM API route handlers under `crm/app/api/`, Express channel service |
| **System design** | Async webhook-driven simulator; forward-only status handling in `ReceiptService` |
| **Data modeling** | Five Prisma models (`crm/prisma/schema.prisma`) with relationships and selective denormalization |
| **Service-layer architecture** | Routes delegate to `crm/services/*.ts`; reusable `SegmentEngine` |
| **AI integration** | `AgentOrchestrator` pipeline, Zod-validated Groq output, self-correction on empty segments, insight fallback |
| **API design** | REST resources, inbound webhook receiver, channel service returns `202 Accepted` before simulation |
| **Pragmatic performance choices** | Batch dispatch (20), debounced stats sync, in-memory insight cache, Gemini rate-limit cooldown |
| **Developer experience** | Seed script, typed constants, SWR data layer, shadcn-based UI |

---

## Quick API Reference

CRM handlers live under `crm/app/api/`. Channel service runs on port 3001 by default.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/stats` | Dashboard aggregates |
| GET / POST | `/api/customers` | List / upsert customers |
| POST | `/api/customers/upload` | CSV customer import |
| GET / POST | `/api/orders` | List / create orders |
| POST | `/api/orders/upload` | CSV order import |
| GET / POST | `/api/segments` | List / create segments |
| GET / DELETE | `/api/segments/[id]` | Get / delete segment |
| GET | `/api/segments/[id]/preview` | Preview saved segment audience |
| POST | `/api/segments/preview` | Preview rules before save |
| POST | `/api/segments/ai` | AI-assisted segment from natural language |
| GET / POST | `/api/campaigns` | List / create campaigns |
| GET / DELETE | `/api/campaigns/[id]` | Get / delete campaign |
| POST | `/api/campaigns/generate` | AI Autopilot |
| POST | `/api/campaigns/[id]/launch` | Launch campaign to simulator |
| GET | `/api/campaigns/[id]/insights` | Campaign performance insights |
| POST | `/api/webhooks/receipt` | Delivery status callbacks |
| POST | `http://localhost:3001/api/send` | Accept message for simulation |
| GET | `http://localhost:3001/api/health` | Channel service health check |

---

Built for the **Xeno SDE Internship Assignment**.
