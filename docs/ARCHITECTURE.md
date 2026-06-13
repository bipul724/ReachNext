# Architecture Guide — Xeno Mini CRM

This document explains how **Xeno Mini CRM** is structured internally and why certain architectural decisions were made.

**Audience:**

- New developers onboarding to the project
- Internship reviewers
- Interviewers evaluating engineering decisions

**Last updated:** June 2026

**Scope:** Based on inspection of the repository implementation. Where something cannot be confirmed from code, it is marked **Unable to determine from implementation.**

**Related:** High-level setup and feature summary live in the root [`README.md`](../README.md). Channel service details: [`channel-service/README.md`](../channel-service/README.md), [`CHANNEL_SERVICE.md`](./CHANNEL_SERVICE.md). This document focuses on architecture, data flow, and design rationale.

**Verified against repo (June 2026):** 9 files under `crm/services/`; one Prisma migration (`20260610063607_init`); `useSegmentPreview` exported but not imported by any page; `agentThoughts` and `convertedAt` present in `schema.prisma` but absent from init migration SQL.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Context Diagram](#system-context-diagram)
- [Major Components](#major-components)
- [Request Lifecycle](#request-lifecycle)
- [Campaign Execution Architecture](#campaign-execution-architecture)
- [Webhook Architecture](#webhook-architecture)
- [AI Workflow Architecture](#ai-workflow-architecture)
- [Data Flow](#data-flow)
- [Service Layer Architecture](#service-layer-architecture)
- [Database Architecture](#database-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Performance Considerations](#performance-considerations)
- [Security Considerations](#security-considerations)
- [Architectural Trade-offs](#architectural-trade-offs)
- [Limitations](#limitations)
- [Scaling and Production Considerations](#scaling-and-production-considerations)
- [Key Takeaways for New Developers](#key-takeaways-for-new-developers)

---

# Architecture Overview

## What problem does this architecture solve?

The system models a **marketing CRM workflow** for a retail business:

1. Store and query customer and order data
2. Define audiences (segments) with rules or natural language
3. Create and launch multi-channel campaigns (email, SMS, WhatsApp)
4. Track a **delivery funnel** (sent → delivered → opened/read → clicked → converted)
5. Attribute revenue to campaigns and surface performance insights

Because real messaging providers (SendGrid, Twilio, etc.) are external and asynchronous, the architecture separates **campaign orchestration** (CRM) from **delivery simulation** (channel service) and connects them with **webhooks**.

## Why was the project split this way?

| Split | Rationale (from implementation) |
|-------|--------------------------------|
| **`crm/` vs `channel-service/`** | The CRM owns data, UI, and business rules. The channel service mimics a third-party provider that accepts sends immediately (`202`) and reports status later via callbacks — matching real-world messaging APIs. See `channel-service/src/controllers/send.controller.ts`. |
| **Route handlers vs `services/`** | API routes in `crm/app/api/` stay thin; business logic lives in `crm/services/` for reuse and clarity. |
| **LLM vs deterministic AI modules** | Groq/Gemini are used where natural language adds value; strategy, copy, and batch personalization use local logic to avoid rate limits and latency at launch time. See comments in `crm/ai/content.ts`. |

## Major subsystems

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CRM Frontend      crm/app/*.tsx, crm/components/        │
│ 2. CRM API Layer     crm/app/api/**/route.ts               │
│ 3. Service Layer     crm/services/*.ts                     │
│ 4. AI Modules        crm/ai/*.ts, crm/lib/groq.ts,         │
│                      crm/lib/gemini-insights.ts            │
│ 5. Data Access       crm/lib/prisma.ts → PostgreSQL         │
│ 6. Channel Simulator channel-service/src/                  │
└─────────────────────────────────────────────────────────────┘
```

## Architectural styles in use

The repository combines several patterns:

| Style | Where | Evidence |
|-------|-------|----------|
| **Client–Server** | Browser ↔ Next.js | React pages call `/api/*` endpoints |
| **Layered architecture** | CRM backend | Routes → Services → Prisma → DB |
| **Feature-based folders** | `crm/ai/`, `crm/services/`, `crm/hooks/` | Grouped by concern |
| **Monolith** | `crm/` | Single Next.js deployable (UI + API) |
| **Auxiliary service** | `channel-service/` | Separate Express process; HTTP + webhooks only |

It is **not** a microservices architecture in the full sense — there is one primary application and one small companion simulator, not independently scaled domain services.

## Why this combination?

For an **internship assignment**, this balances:

- **Demonstrable full-stack work** in one repo (`crm/`)
- **Realistic async integration** without paid provider accounts (`channel-service/`)
- **Maintainable structure** without over-engineering (no message queue, no auth layer)

---

# System Context Diagram

```
                         ┌──────────────────┐
                         │   Developer /    │
                         │   Marketer       │
                         │   (Browser)      │
                         └────────┬─────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CRM — Next.js 15 (crm/)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ app/*.tsx   │→ │ app/api/*   │→ │ services/*   │→ │ lib/prisma │ │
│  │ hooks/ SWR  │  │ route.ts    │  │ ai/*         │  └─────┬──────┘ │
│  └─────────────┘  └─────────────┘  └──────┬───────┘        │        │
│                                           │                 │        │
│                                    lib/groq.ts              │        │
│                                    lib/gemini-insights.ts   │        │
└───────────────────────────────────────────┼─────────────────┼────────┘
                                            │                 │
              ┌─────────────────────────────┼─────────────────┼──────────┐
              │                             │                 │          │
              ▼                             ▼                 ▼          │
     ┌────────────────┐           ┌─────────────────┐  ┌──────────────┐  │
     │ Groq API       │           │ Google Gemini   │  │ PostgreSQL   │  │
     │ (segmentation) │           │ (insights only) │  │              │  │
     └────────────────┘           └─────────────────┘  └──────────────┘  │
              │                                                          │
              │ POST /api/send (per communication)                       │
              ▼                                                          │
┌─────────────────────────────────────────────────────────────────────┐  │
│              Channel Service — Express 5 (channel-service/)        │  │
│   POST /api/send → simulateMessage() → sendCallback() ─────────────┼──┘
└─────────────────────────────────────────────────────────────────────┘
              │
              │ POST /api/webhooks/receipt
              ▼
       ReceiptService → OrderService (on "converted")
```

**External dependencies (confirmed in code):**

- **PostgreSQL** — `crm/prisma/schema.prisma` (`provider = "postgresql"`)
- **Groq** — `crm/lib/groq.ts` (`llama-3.3-70b-versatile`)
- **Google Gemini** — `crm/lib/gemini-insights.ts` (`gemini-2.5-pro`)

Hosting provider (Supabase, Vercel, etc.) is mentioned in `README.md` only — **Unable to determine from implementation** as deployed infrastructure.

---

# Major Components

## CRM (`crm/`)

**Purpose:** Full-stack marketing CRM — UI, REST API, business logic, database access, and AI-assisted campaign workflows.

**Responsibilities:**

- Render dashboard, customers, segments, and campaigns (`crm/app/`)
- Expose REST API under `crm/app/api/`
- Execute business rules in `crm/services/`
- Persist data via Prisma (`crm/lib/prisma.ts`)
- Call Groq/Gemini for AI features

**Important folders:**

| Folder | Role |
|--------|------|
| `app/` | Next.js App Router pages and API routes |
| `services/` | Business logic (9 modules) |
| `ai/` | Segmentation, strategy, content agents; Zod schemas; prompts |
| `lib/` | Prisma client, Groq wrapper, Gemini insights, CSV parser, constants |
| `hooks/` | SWR data-fetching hooks |
| `components/` | Layout, UI primitives, `AgentThoughtsTimeline` |
| `prisma/` | Schema, migrations, seed script |
| `types/` | Shared TypeScript interfaces |

**Technologies:** Next.js 15.5, React 19, Prisma 7 with `@prisma/adapter-pg`, Tailwind CSS 4, SWR, Zod, Recharts (per `crm/package.json`).

**How it communicates:**

- **Inbound:** Browser HTTP to pages and `/api/*`
- **Outbound to DB:** Prisma via `pg` pool
- **Outbound to Groq:** `fetch` in `crm/lib/groq.ts`
- **Outbound to Gemini:** `@google/generative-ai` in `crm/lib/gemini-insights.ts`
- **Outbound to channel service:** `fetch` in `crm/services/campaign-sender.ts` → `POST ${CHANNEL_SERVICE_URL}/api/send`
- **Inbound webhooks:** `POST /api/webhooks/receipt` from channel service

**Why it exists:** Single application that demonstrates end-to-end CRM functionality for the Xeno SDE Internship Assignment.

---

## Channel Service (`channel-service/`)

**Docs:** [`channel-service/README.md`](../channel-service/README.md) · [`CHANNEL_SERVICE.md`](./CHANNEL_SERVICE.md) (volume, ordering, retries, failures)

**Purpose:** Standalone **delivery simulator** — not a real messaging provider.

**Responsibilities:**

- Accept send requests (`POST /api/send`)
- Return `202 Accepted` immediately
- Run probabilistic delivery lifecycle in the background
- POST status updates to the CRM webhook URL

**Important files:**

| File | Role |
|------|------|
| `src/index.ts` | Express bootstrap, CORS, JSON parser |
| `src/controllers/send.controller.ts` | Validation, trigger simulation |
| `src/simulation/simulator.ts` | `setTimeout`-driven state machine |
| `src/simulation/probabilities.ts` | Per-channel transition odds and delays |
| `src/simulation/callback.ts` | Webhook POST with retries |
| `src/config/env.ts` | `PORT`, `CRM_WEBHOOK_URL` |

**Simulation flow:**

```
POST /api/send
    → validate payload
    → simulateMessage(payload, callbackUrl)  [non-blocking]
    → return 202

simulateMessage:
    transition("queued")
        → setTimeout(delay)
        → sendCallback(webhook, { status, timestamp })
        → transition(nextStatus) until terminal
```

Terminal states: `failed`, end of funnel without conversion, or `converted`.

**Webhook behavior:**

- Each state change triggers `sendCallback()` in `channel-service/src/simulation/callback.ts`
- Up to **3 attempts** with exponential backoff on failure
- Payload: `{ communicationId, status, timestamp, error? }`

**Why separated from CRM:**

1. Models how real providers work (async acceptance + callbacks)
2. Keeps long-running `setTimeout` chains out of Next.js API route lifecycle
3. Demonstrates cross-service integration with explicit env URLs (`CHANNEL_SERVICE_URL`, `CRM_WEBHOOK_URL`)

---

## Database

**Purpose:** Persistent storage for customers, orders, segments, campaigns, and per-recipient communications.

**Technology:** PostgreSQL via Prisma 7 (`crm/prisma/schema.prisma`, `crm/lib/prisma.ts`).

**Schema ownership:** Entirely in `crm/prisma/`. The channel service has **no database**.

**How CRM interacts:**

- `PrismaClient` with `PrismaPg` adapter and `pg.Pool`
- Connection string from `DATABASE_URL`
- Migrations configured in `crm/prisma.config.ts` (uses `DIRECT_URL` or `DATABASE_URL`)

**Important models (5):**

| Model | Table | Purpose |
|-------|-------|---------|
| `Customer` | `customers` | Buyer profile; denormalized spend/order stats |
| `Order` | `orders` | Purchases; optional `attributedCampaignId` |
| `Segment` | `segments` | Audience rules as JSON |
| `Campaign` | `campaigns` | Marketing blast metadata + funnel `stats` JSON |
| `Communication` | `communications` | One message to one customer; delivery lifecycle |

**Relationships:** See [Database Architecture](#database-architecture) ER diagram.

**Schema drift (verified):** `crm/prisma/schema.prisma` defines `Campaign.agentThoughts` and `Communication.convertedAt`, but `crm/prisma/migrations/20260610063607_init/migration.sql` does **not** create these columns. Running `npx prisma migrate reset` from a clean clone may produce a database that does **not** match the current schema file. Before reset, run `npx prisma migrate diff` or compare your live DB to `schema.prisma`, and add a follow-up migration if needed.

---

## AI Components

| Module | Provider | Model | What it does | Called from |
|--------|----------|-------|--------------|-------------|
| `crm/lib/groq.ts` | Groq | `llama-3.3-70b-versatile` | `safeGenerate()` — segmentation prompts, self-correction | `crm/ai/segmentation.ts`, `crm/services/agent-orchestrator.ts` |
| `crm/ai/segmentation.ts` | Groq (via `safeGenerate`) | — | Natural language → segment rules JSON | `AgentOrchestrator`, `POST /api/segments/ai` |
| `crm/ai/strategy.ts` | **None (deterministic)** | — | Channel, offer, timing heuristics | `AgentOrchestrator` only |
| `crm/ai/local-nlp-parser.ts` | **None** | — | Regex parsing for copy templates | `crm/ai/content.ts` |
| `crm/ai/content.ts` | **None at generate**; local at launch | — | `runContentAgent`, `generateBatchMessages` | `AgentOrchestrator`, `CampaignSender` |
| `crm/lib/gemini-insights.ts` | Google Gemini | `gemini-2.5-pro` | Post-campaign narrative insights | `crm/services/insights.service.ts` |

**Why mix LLMs with deterministic logic:**

1. **Segmentation** benefits from LLM flexibility (natural language goals)
2. **Strategy and copy at generate time** use heuristics — predictable, fast, no API cost (`crm/ai/strategy.ts`, `crm/ai/content.ts`)
3. **Launch-time personalization** must handle many recipients — `generateBatchMessages()` explicitly avoids LLM calls to prevent rate limits (`crm/ai/content.ts` comment)

**Failure and fallback behavior:**

| Step | Failure behavior | Evidence |
|------|------------------|----------|
| Segmentation parse/LLM error | Fallback segment: all customers (`rules: { and: [] }`) | `crm/ai/segmentation.ts` catch block |
| Segmentation 0 matches | Up to 2 Groq self-correction retries with DB aggregate hints | `crm/services/agent-orchestrator.ts` |
| Still 0 matches after retries | Campaign saved with `status: "failed"` | `agent-orchestrator.ts` |
| Strategy/content errors | Logged; defaults used | `agent-orchestrator.ts` try/catch |
| Groq API transient errors | Retry with backoff (429, 500, 502, 503, 504) | `crm/lib/groq.ts` |
| Gemini insights failure | `buildProgrammaticInsight()` fallback | `crm/services/insights.service.ts` |
| Gemini rate limit | 2-minute cooldown circuit breaker | `crm/lib/gemini-insights.ts` |

**Unused prompts (dead code):** `crm/ai/prompts/strategy.prompt.ts` and `crm/ai/prompts/message.prompt.ts` are not imported anywhere — legacy from an earlier LLM-based approach.

---

# Request Lifecycle

A typical **read request** (e.g. list campaigns):

```
Browser
    │  GET /api/campaigns
    ▼
crm/app/api/campaigns/route.ts
    │  export async function GET()
    │  try/catch, no auth check
    ▼
CampaignService.list()
    │  prisma.campaign.findMany({ include: segment })
    ▼
crm/lib/prisma.ts → PostgreSQL
    ▼
NextResponse.json(campaigns)
    ▼
SWR fetcher (crm/lib/api.ts) → React re-render
```

A typical **write request** (e.g. create segment):

```
Browser POST /api/segments { name, rules }
    ▼
crm/app/api/segments/route.ts
    │  manual validation (400 if missing fields)
    ▼
SegmentService.create()
    │  SegmentEngine.buildWhereClause(rules)
    │  prisma.customer.count()
    │  prisma.segment.create()
    ▼
201 + segment JSON
```

## Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **UI** | `crm/app/**/*.tsx` | User interaction, local form state, `fetch` / SWR |
| **API routes** | `crm/app/api/**/route.ts` | HTTP parsing, basic validation, status codes, delegate to services |
| **Services** | `crm/services/*.ts` | Business rules, orchestration, transactions |
| **AI** | `crm/ai/*`, `crm/lib/groq.ts` | LLM calls, deterministic agents, schemas |
| **Data access** | `crm/lib/prisma.ts` | DB connection singleton |
| **Database** | PostgreSQL | Persistence |

**Exceptions (routes that bypass services):**

- `crm/app/api/dashboard/stats/route.ts` — queries Prisma directly
- `crm/app/api/customers/upload/route.ts` — Prisma upsert per CSV row
- `crm/app/api/orders/upload/route.ts` — uses `OrderService.create` but customer lookup inline

---

# Campaign Execution Architecture

Complete workflow from Autopilot generation through simulated delivery:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GENERATION (POST /api/campaigns/generate)                                │
└─────────────────────────────────────────────────────────────────────────┘
User enters goal on crm/app/campaigns/new/page.tsx
    ↓
AgentOrchestrator.generateCampaign(goal)
    ├─ runSegmentationAgent(goal)          [Groq + Zod]
    ├─ SegmentEngine + prisma sizing loop  [self-correction if 0 matches]
    ├─ runStrategyAgent(...)               [deterministic]
    ├─ runContentAgent(...)                [local-nlp-parser]
    ├─ prisma.segment.create
    └─ prisma.campaign.create (status: draft | failed)
    ↓
CampaignWorkspacePayload returned to UI

┌─────────────────────────────────────────────────────────────────────────┐
│ LAUNCH (POST /api/campaigns/[id]/launch)                               │
└─────────────────────────────────────────────────────────────────────────┘
CampaignSender.launch(campaignId)
    ├─ validate status === "draft"
    ├─ campaign.status → "sending"
    ├─ SegmentEngine.buildWhereClause(segment.rules)
    ├─ prisma.customer.findMany(where)     [entire audience in memory]
    ├─ generateBatchMessages(...)          [local placeholder replacement]
    ├─ prisma.communication.createMany
    ├─ prisma.communication.findMany       [retrieve IDs]
    ├─ dispatchToChannelService()          [batches of 20, parallel per batch]
    │     └─ POST channel-service/api/send per communication
    └─ campaign.status → "sent" (or "failed" on error)

┌─────────────────────────────────────────────────────────────────────────┐
│ SIMULATION (channel-service)                                           │
└─────────────────────────────────────────────────────────────────────────┘
handleSend → 202 Accepted
simulateMessage → probabilistic transitions
    ↓ each transition
POST CRM_WEBHOOK_URL/api/webhooks/receipt

┌─────────────────────────────────────────────────────────────────────────┐
│ RECEIPT + ANALYTICS (CRM)                                              │
└─────────────────────────────────────────────────────────────────────────┘
ReceiptService.processCallback
    ├─ forward-only status update
    ├─ on "converted" → OrderService.create
    └─ CampaignService.queueSyncStats (debounced 1.5s)
    ↓
crm/app/campaigns/[id]/page.tsx polls GET /api/campaigns/[id] every 2.5s
GET /api/campaigns/[id]/insights → getCampaignInsight (Gemini or fallback)
```

---

# Webhook Architecture

## Why webhooks?

Real messaging providers do not return final delivery status in the send response. They accept the message and later notify your system. The channel service mirrors this: `202 Accepted` in `send.controller.ts`, then async callbacks.

## How delivery updates are processed

**Entry:** `crm/app/api/webhooks/receipt/route.ts` → `ReceiptService.processCallback()`

**Steps in `crm/services/receipt.service.ts`:**

1. Load `Communication` by `communicationId`
2. Compare incoming `status` against `STATUS_PRIORITY` map
3. Reject backward transitions (e.g. `delivered` after `clicked`)
4. Reject updates if current status is `failed` (terminal)
5. Update `status`, timestamp fields (`sentAt`, `deliveredAt`, etc.), append `statusHistory`
6. If `status === "converted"`, call `OrderService.create()` with random ₹500–₹2500 order
7. Call `CampaignService.queueSyncStats(campaignId)`

## Duplicate or invalid updates

| Case | Behavior |
|------|----------|
| Unknown `communicationId` | Log warning; return `processed: false` |
| Backward status transition | Ignored; `processed: false` |
| Already `failed` | Ignored; `processed: false` |
| Same or lower priority status | Ignored |
| Valid forward transition | Updated; `processed: true` |

There is **no idempotency key** and **no webhook signature** — duplicate forward callbacks with the same status would be ignored by priority check; replays of the same transition are not explicitly deduplicated beyond priority logic.

## Ordering guarantees

**None.** Callbacks use independent `setTimeout` chains per message. Network retries (`callback.ts`) can theoretically arrive out of order. The priority ladder in `ReceiptService` is the primary ordering defense.

## Sequence diagram (single message)

```
CampaignSender          Channel Service              CRM (ReceiptService)
      │                        │                            │
      │ POST /api/send         │                            │
      │───────────────────────>│                            │
      │ 202 Accepted           │                            │
      │<───────────────────────│                            │
      │                        │ setTimeout...              │
      │                        │ POST /webhooks/receipt     │
      │                        │ {status: "sent"}           │
      │                        │───────────────────────────>│
      │                        │                            │ update Communication
      │                        │ POST ... {delivered}       │
      │                        │───────────────────────────>│
      │                        │ ... opened/read/clicked    │
      │                        │ POST ... {converted}       │
      │                        │───────────────────────────>│
      │                        │                            │ OrderService.create
      │                        │                            │ queueSyncStats
```

## Limitations

- Unsigned webhooks — any caller can POST to `/api/webhooks/receipt`
- No dead-letter queue for failed callbacks (channel service logs after 3 retries)
- `statusHistory` stored as JSON string in some code paths and JSON in schema — mixed handling in `receipt.service.ts`

---

# AI Workflow Architecture

```
                    ┌─────────────────────┐
                    │ Natural language    │
                    │ goal or prompt      │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ POST /segments/ai│  │ POST /campaigns/│  │ GET /campaigns/ │
│ runSegmentation │  │ generate        │  │ [id]/insights   │
│ Agent only      │  │ AgentOrchestrator│  │ getCampaignInsight│
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         ▼                    ▼                     ▼
    ┌─────────┐         ┌───────────┐         ┌───────────┐
    │  GROQ   │         │   GROQ    │         │  GEMINI   │
    │ segment │         │ segment + │         │ insights  │
    │         │         │ correction│         │           │
    └────┬────┘         └─────┬─────┘         └─────┬─────┘
         │                    │                     │
         ▼                    ▼                     ▼
    Zod parse            Deterministic          JSON parse
    Segmentation         strategy.ts            or fallback
    ResponseSchema       content.ts             programmatic
         │                    │                     │
         └────────────────────┴─────────────────────┘
                               │
                               ▼
                         PostgreSQL
                    (Segment, Campaign, stats)
```

## Step-by-step (Autopilot — `AgentOrchestrator`)

| Step | LLM? | Module | Output |
|------|------|--------|--------|
| 1. Segmentation | **Yes** (Groq) | `ai/segmentation.ts` | `segmentName`, `rules`, `explainAudience` |
| 2. Validation | — | `ai/schemas.ts` Zod | Parsed / rejected → fallback |
| 3. Sizing | — | `SegmentEngine` + Prisma | `customerCount`, AOV, potential revenue |
| 4. Self-correction | **Yes** (Groq, up to 2×) | `agent-orchestrator.ts` | Relaxed rules if count = 0 |
| 5. Strategy | **No** | `ai/strategy.ts` | `channel`, `offer`, `timing` |
| 6. Content | **No** | `ai/content.ts` → `local-nlp-parser.ts` | `subject`, `body` with `[Name]` placeholders |
| 7. Persist | — | Prisma | `Segment` + `Campaign` (+ `agentThoughts` JSON) |

## Insights (post-campaign)

| Step | LLM? | Module |
|------|------|--------|
| Load campaign stats | — | `insights/route.ts` + Prisma |
| Cache check | — | `insights.service.ts` `insightCache` Map |
| Generate | **Yes** (Gemini) if cache miss | `gemini-insights.ts` |
| Fallback | **No** | `buildProgrammaticInsight()` |

---

# Data Flow

## Customer Import

```
Source:     CSV pasted in UI (crm/app/customers/page.tsx)
            or prisma db seed (crm/prisma/seed.ts)
    ↓
Capture:    POST /api/customers/upload { csvText }
            or seed script loops
    ↓
Processing: parseCSVRow() per line (crm/lib/csv-parser.ts)
            prisma.customer.upsert by email
    ↓
Persistence: customers table
    ↓
Presentation: useCustomers() SWR → customers table UI
              Dashboard stats via customer.count()
```

## Segment Creation

**Manual path:**

```
Source:     /segments/new form state
    ↓
Capture:    POST /api/segments/preview on rule change (useEffect)
            POST /api/segments on save
    ↓
Processing: SegmentService.getPreviewCount / getPreviewCustomers
            SegmentEngine.buildWhereClause
            SegmentService.create → count + insert
    ↓
Persistence: segments table
    ↓
Presentation: /segments list via useSegments()
```

**AI-assisted path:**

```
Source:     natural language prompt
    ↓
Capture:    POST /api/segments/ai OR via AgentOrchestrator
    ↓
Processing: runSegmentationAgent → Groq → Zod
    ↓
Persistence: (ai route returns JSON only; orchestrator also saves)
    ↓
Presentation: rules populated in segment builder UI
```

## Campaign Generation

```
Source:     goal string on /campaigns/new
    ↓
Capture:    POST /api/campaigns/generate
    ↓
Processing: AgentOrchestrator.generateCampaign (full AI pipeline)
    ↓
Persistence: segments + campaigns rows (draft or failed)
    ↓
Presentation: workspace UI + AgentThoughtsTimeline
```

## Campaign Launch

```
Source:     Launch button → campaignId
    ↓
Capture:    POST /api/campaigns/[id]/launch
    ↓
Processing: CampaignSender.launch
    ↓
Persistence: communications (bulk), campaign status/recipients
    ↓
Presentation: redirect to /campaigns/[id], polling funnel
```

## Delivery Updates

```
Source:     channel-service simulator
    ↓
Capture:    POST /api/webhooks/receipt
    ↓
Processing: ReceiptService.processCallback
    ↓
Persistence: communications status/timestamps; optional orders
    ↓
Presentation: funnel bars on campaign detail page (polled stats)
```

## Conversion Attribution

```
Source:     webhook status "converted" OR manual POST /api/orders
    ↓
Processing: OrderService.create (transaction)
            - find latest communication in 7 days before orderDate
            - set attributedCampaignId
            - update customer aggregates
            - bump campaign stats JSON
    ↓
Persistence: orders, customers, campaigns.stats
    ↓
Presentation: dashboard recent orders, campaign conversion revenue
```

---

# Service Layer Architecture

Business logic is separated from API routes so that:

- Routes stay thin (HTTP concerns only)
- Logic can be called from multiple routes or webhook handlers
- Domain rules live in one place

## Service catalog

### `CustomerService` (`crm/services/customer.service.ts`)

| | |
|---|---|
| **Purpose** | Customer list, get, create, upsert |
| **Dependencies** | `prisma` |
| **Used by** | `GET/POST /api/customers` |
| **Key responsibilities** | Search with `OR` on name/email/city; upsert by email |

### `OrderService` (`crm/services/order.service.ts`)

| | |
|---|---|
| **Purpose** | Order listing and creation with side effects |
| **Dependencies** | `prisma` |
| **Used by** | `GET/POST /api/orders`, `orders/upload`, `ReceiptService` |
| **Key responsibilities** | 7-day campaign attribution; update customer denormalized fields; update campaign conversion stats in transaction |

### `SegmentService` (`crm/services/segment.service.ts`)

| | |
|---|---|
| **Purpose** | Segment CRUD and preview |
| **Dependencies** | `prisma`, `SegmentEngine` |
| **Used by** | `/api/segments/*` |
| **Key responsibilities** | Count customers on create; block delete if campaigns reference segment |

### `SegmentEngine` (`crm/services/segment-engine.ts`)

| | |
|---|---|
| **Purpose** | Translate JSON rules → Prisma `CustomerWhereInput` |
| **Dependencies** | `types` |
| **Used by** | `SegmentService`, `AgentOrchestrator`, `CampaignSender` |
| **Key responsibilities** | Support fields: `totalSpent`, `totalOrders`, `city`, `daysSinceLastOrder`, `lastOrderAt`, `createdAt` |

### `CampaignService` (`crm/services/campaign.service.ts`)

| | |
|---|---|
| **Purpose** | Campaign CRUD and funnel stat aggregation |
| **Dependencies** | `prisma` |
| **Used by** | `/api/campaigns/*`, `ReceiptService`, `CampaignSender` |
| **Key responsibilities** | `syncStats()` from communication groupBy; `queueSyncStats()` debounced 1.5s; merge stats JSON preserving AI metadata |

### `CampaignSender` (`crm/services/campaign-sender.ts`)

| | |
|---|---|
| **Purpose** | Launch campaigns and dispatch to channel service |
| **Dependencies** | `prisma`, `SegmentEngine`, `generateBatchMessages`, env URLs |
| **Used by** | `POST /api/campaigns/[id]/launch` |
| **Key responsibilities** | Audience resolution, bulk communications, batch HTTP dispatch (20), status transitions |

### `AgentOrchestrator` (`crm/services/agent-orchestrator.ts`)

| | |
|---|---|
| **Purpose** | End-to-end Autopilot pipeline |
| **Dependencies** | AI modules, `SegmentEngine`, `safeGenerate`, `prisma` |
| **Used by** | `POST /api/campaigns/generate` |
| **Key responsibilities** | Segmentation, sizing, self-correction, strategy, content, persist draft campaign |

### `ReceiptService` (`crm/services/receipt.service.ts`)

| | |
|---|---|
| **Purpose** | Process delivery webhooks |
| **Dependencies** | `prisma`, `OrderService`, `CampaignService` |
| **Used by** | `POST /api/webhooks/receipt` |
| **Key responsibilities** | Status priority ladder; conversion orders; trigger stats sync |

### `insights.service.ts` (`crm/services/insights.service.ts`)

| | |
|---|---|
| **Purpose** | Campaign narrative insights with cache |
| **Dependencies** | `gemini-insights.ts` |
| **Used by** | `GET /api/campaigns/[id]/insights` |
| **Key responsibilities** | In-memory cache keyed by funnel hash; programmatic fallback |

---

# Database Architecture

## Technology and access

- **PostgreSQL** (Prisma provider)
- **Prisma 7** with driver adapter: `PrismaPg` + `pg.Pool` (`crm/lib/prisma.ts`)
- **Migrations:** `crm/prisma/migrations/` (one init migration present)
- **Seed:** `crm/prisma/seed.ts` — 500 customers, 2000+ orders, 4 segments

## ER diagram

```
customers                          segments
├── id (PK)                        ├── id (PK)
├── email (UNIQUE)                 ├── name
├── name, phone, city              ├── rules (JSON)
├── tags[]                         ├── naturalLanguageQuery
├── totalOrders  ─── denormalized  ├── customerCount
├── totalSpent   ─── denormalized  └── createdBy, createdAt
├── lastOrderAt  ─── denormalized         │
└── createdAt                             │ 1:N
      │                                   ▼
      │ 1:N                        campaigns
      │                            ├── id (PK)
      ├──────────────────────────► ├── segmentId (FK)
      │                            ├── channel, messageTemplate
      │                            ├── status
      ▼                            ├── stats (JSON)
   orders                          ├── agentThoughts (JSON)
   ├── id (PK)                     ├── totalRecipients
   ├── customerId (FK)             └── sentAt, completedAt
   ├── orderDate                         │
   ├── totalAmount                       │ 1:N
   ├── items (JSON)                     ▼
   ├── storeLocation              communications
   └── attributedCampaignId (FK)──►├── id (PK)
         (optional link back)       ├── campaignId (FK) [index]
                                    ├── customerId (FK) [index]
                                    ├── personalisedMessage
                                    ├── status, statusHistory (JSON)
                                    └── sentAt … convertedAt, failedAt
```

## Denormalized fields

| Field | Model | Maintained by | Why |
|-------|-------|---------------|-----|
| `totalOrders`, `totalSpent`, `lastOrderAt` | Customer | `OrderService.create` | Fast segment filtering without aggregates |
| `customerCount` | Segment | `SegmentService.create` | Display cached count on list |

## JSON fields

| Field | Model | Contents |
|-------|-------|----------|
| `rules` | Segment | `{ and: [{ field, op, value }] }` |
| `stats` | Campaign | Funnel counts + AI metadata (`goal`, `offer`, explanations) |
| `agentThoughts` | Campaign | Array of agent reasoning steps |
| `statusHistory` | Communication | Timeline of status changes |
| `items` | Order | Line items array |

**Trade-off:** Flexibility without migrations vs weaker schema enforcement at the database level.

## Indexes (from init migration)

- `customers.email` UNIQUE
- `communications.campaignId`
- `communications.customerId`

No indexes on segment filter columns (`city`, `totalSpent`, `lastOrderAt`) in migration.

---

# Frontend Architecture

## App Router organization

All routes under `crm/app/`:

| Route | File | Type |
|-------|------|------|
| `/` | `page.tsx` | `"use client"` |
| `/customers` | `customers/page.tsx` | client |
| `/segments` | `segments/page.tsx` | client |
| `/segments/new` | `segments/new/page.tsx` | client |
| `/campaigns` | `campaigns/page.tsx` | client |
| `/campaigns/new` | `campaigns/new/page.tsx` | client |
| `/campaigns/[id]` | `campaigns/[id]/page.tsx` | client |

**Root layout** (`crm/app/layout.tsx`) is a **Server Component** wrapping `Sidebar`, `Header`, `Toaster`, and `{children}`.

There is **no** `middleware.ts` and **no** nested layouts.

## Component organization

```
components/
├── layout/          sidebar.tsx, header.tsx — shell navigation
├── ui/              shadcn-style primitives (button, card, table, …)
└── agent-thoughts-timeline.tsx — AI reasoning visualization
```

Pages compose UI primitives directly — no page-specific component subfolders.

## Hooks and SWR

| Hook | File | Endpoint |
|------|------|----------|
| `useCustomers` | `hooks/use-customers.ts` | `GET /api/customers?limit&offset&search` |
| `useCampaigns` | `hooks/use-campaigns.ts` | `GET /api/campaigns` |
| `useCampaign` | `hooks/use-campaigns.ts` | `GET /api/campaigns/[id]` |
| `useSegments` | `hooks/use-segments.ts` | `GET /api/segments` |
| `useSegmentPreview` | `hooks/use-segments.ts` | `GET /api/segments/[id]/preview` — exported but **not imported by any page** (future-facing; API route exists) |

Shared fetcher: `crm/lib/api.ts` — throws on non-OK responses.

## Polling behavior

`useCampaign(id, isLive)` sets `refreshInterval: 2500` when `isLive` is true (`crm/hooks/use-campaigns.ts`). Campaign detail page enables this while status is `sending`.

Insights on campaign detail use a separate `useSWR` call to `/api/campaigns/[id]/insights`.

## State management

| Concern | Approach |
|---------|----------|
| Server data | SWR |
| Form state | `useState` / `useEffect` in pages |
| Mutations | Direct `fetch()` + `sonner` toasts |
| Global client state | None (no Redux, Zustand, Context for data) |

## Why all pages are client components

Enables interactive forms, SWR, and polling without splitting server/client data boundaries. Trade-off: no Server Component data fetching on initial load for list pages.

---

# Performance Considerations

| Implementation | Location | Benefit | Trade-off |
|----------------|----------|---------|-----------|
| Batch dispatch (20) | `campaign-sender.ts` `dispatchToChannelService` | Limits concurrent HTTP to channel service | Launch latency grows with audience size |
| `createMany` for communications | `campaign-sender.ts` | Bulk insert vs per-row create | Extra `findMany` needed to get IDs |
| Debounced `queueSyncStats` (1.5s) | `campaign.service.ts` | Fewer stat aggregations during webhook bursts | Stats briefly stale |
| SWR polling 2.5s | `use-campaigns.ts` | Simple live UI during send | Many HTTP requests |
| In-memory insight cache | `insights.service.ts` | Avoids duplicate Gemini calls | Not shared across instances / cold starts |
| Gemini rate-limit cooldown (2 min) | `gemini-insights.ts` | Prevents hammering API after 429 | Insights fall back during cooldown |
| Groq retry + 15s timeout | `groq.ts` | Resilience to transient API errors | Longer tail latency on failures |
| Local batch personalization | `ai/content.ts` | No LLM at launch | Less creative per-message copy |
| Denormalized customer fields | `customers` table | Faster segment queries | Must update on every order |
| `Promise.all` on dashboard stats | `dashboard/stats/route.ts` | Parallel Prisma queries | Still 6 queries per dashboard load |

---

# Security Considerations

## Implemented (limited)

| Measure | Evidence |
|---------|----------|
| Parameterized queries | Prisma throughout services |
| Basic request validation | Manual checks in API routes (400 on missing fields) |
| Webhook status validation | Allowed status enum in `webhooks/receipt/route.ts` |
| Zod validation for AI JSON | `crm/ai/schemas.ts` |
| Error handling | try/catch in routes; services log errors |
| `.env` gitignored | Root `.gitignore` |

## Not implemented (assignment scope)

| Measure | Status |
|---------|--------|
| Authentication | **None** — no `middleware.ts`, no User model |
| Authorization / RBAC | **None** |
| Webhook signing | **None** — public webhook endpoint |
| Rate limiting | **None** on CRM APIs |
| CSRF protection | **None** |
| CORS lockdown | Channel service uses default `cors()` (all origins) |

These omissions align with a **local demo / internship scope** focused on CRM workflow rather than production hardening. **Do not expose this application to the public internet with real customer data without addressing authentication and webhook verification.**

---

# Architectural Trade-offs

## Separate channel service

| | |
|---|---|
| **Decision** | Run delivery simulation in `channel-service/` instead of inside Next.js |
| **Why** | Mimics async provider pattern; keeps long `setTimeout` chains out of serverless-unfriendly API routes |
| **Alternatives** | In-process simulator; serverless queue worker |
| **Advantages** | Clear boundary; realistic 202 + webhook flow |
| **Disadvantages** | Two processes locally; duplicated TypeScript types; env URL wiring |

## SWR polling vs WebSockets

| | |
|---|---|
| **Decision** | Poll campaign endpoint every 2.5s while `sending` |
| **Why** | Simple; no extra infrastructure |
| **Alternatives** | SSE, WebSockets, server push |
| **Advantages** | Works with standard Next.js deployment |
| **Disadvantages** | Higher request volume; not true real-time |

## Hybrid AI vs full LLM pipeline

| | |
|---|---|
| **Decision** | Groq for segmentation; deterministic strategy/copy; Gemini for insights only |
| **Why** | Cost, latency, rate limits — especially at launch (`generateBatchMessages` comment) |
| **Alternatives** | LLM for all agents (unused prompts suggest this was considered) |
| **Advantages** | Predictable launch; fewer API failures at scale |
| **Disadvantages** | Less flexible copy; strategy heuristics may miss nuance |

## Synchronous launch in API handler

| | |
|---|---|
| **Decision** | `CampaignSender.launch` awaits full dispatch before returning |
| **Why** | Simpler error handling; immediate `sentCount` in response |
| **Alternatives** | Background job queue (BullMQ, Inngest) |
| **Advantages** | Easier to reason about for demo |
| **Disadvantages** | Timeouts on large segments; blocks HTTP connection |

## JSON stats on campaigns

| | |
|---|---|
| **Decision** | Store funnel + AI metadata in `campaigns.stats` JSON |
| **Why** | Avoid frequent schema migrations for AI fields |
| **Alternatives** | Normalized tables for metrics and metadata |
| **Advantages** | Fast iteration on Autopilot payload |
| **Disadvantages** | Runtime typing via `as any` in several places |

## No authentication

| | |
|---|---|
| **Decision** | Public API and pages |
| **Why** | Assignment scope prioritizes CRM features |
| **Alternatives** | NextAuth, API keys |
| **Advantages** | Faster development; easier demo |
| **Disadvantages** | Unusable for real PII without hardening |

---

# Limitations

Documented from implementation — not speculation:

1. **Local development focus** — README states not deployed; no Docker/CI in repo
2. **No automated tests** — no test files or test runner in `package.json`
3. **No auth** — all routes public
4. **Unsigned webhooks** — spoofable delivery events
5. **Synchronous campaign launch** — entire audience loaded and dispatched in one API call
6. **No message queue** — failed channel dispatches mark individual communications `failed` only
7. **Simulator only** — no real email/SMS/WhatsApp integration
8. **Schema/migration drift (verified)** — `agentThoughts`, `convertedAt` in `schema.prisma` but not in `20260610063607_init/migration.sql`; `prisma migrate reset` may not match current schema
9. **`useSegmentPreview` hook** — exported in `hooks/use-segments.ts` but no page imports it; kept for a future segment-detail view
10. **Unused AI prompts (verified)** — `crm/ai/prompts/strategy.prompt.ts` and `message.prompt.ts` export prompts but are not imported anywhere
11. **No ordering guarantee on webhooks** — priority ladder only partial defense
12. **Insight cache is in-process memory** — ineffective under horizontal scale

---

# Scaling and Production Considerations

This section describes architectural changes that would be needed beyond the current **local assignment scope** — for example, assuming **100× traffic** (larger audiences, more concurrent campaigns, or a public deployment):

| Recommendation | Why | Expected benefit | Complexity |
|----------------|-----|------------------|------------|
| **Background job queue** for launch | Avoid HTTP timeouts; scale dispatch workers | Reliable large sends | Medium |
| **Authentication + RBAC** | Protect customer PII | Production viability | Medium |
| **Webhook HMAC signing** | Prevent fake conversions | Data integrity | Easy |
| **Real messaging providers** | Replace simulator | Actual delivery | Hard |
| **WebSockets or SSE** for funnel | Reduce polling load | Better UX, fewer requests | Medium |
| **Redis insight cache** | Share cache across instances | Lower Gemini cost | Easy |
| **DB indexes on segment columns** | `city`, `totalSpent`, `lastOrderAt` | Faster previews/launch | Easy |
| **Cursor-based audience iteration** | Don't load full segment into memory | Memory safety | Medium |
| **Docker + CI/CD** | Reproducible deploys and tests | Team velocity | Medium |
| **Horizontal scaling** | Multiple CRM instances + shared DB | Throughput | Hard |
| **Shared types package** | CRM ↔ channel-service contracts | Fewer integration bugs | Easy |
| **Normalize or type `stats` JSON** | Reduce `as any` | Maintainability | Medium |

---

# Key Takeaways for New Developers

## How the system works (30-second version)

1. **CRM** stores customers and campaigns in PostgreSQL.
2. **Segments** filter customers via `SegmentEngine` (JSON rules → Prisma `where`).
3. **Launch** creates one `Communication` per customer and POSTs each to the **channel service**.
4. **Channel service** fakes delivery and webhooks status back.
5. **ReceiptService** updates the funnel and may create orders on conversion.
6. **UI** polls campaign stats while sending.

## Most important concepts

1. **`SegmentEngine`** — core audience resolution (`crm/services/segment-engine.ts`)
2. **Webhook priority ladder** — `ReceiptService` (`crm/services/receipt.service.ts`)
3. **Hybrid AI** — Groq segments; deterministic strategy/copy; Gemini insights
4. **Two-process local dev** — CRM + channel service must both run
5. **Service layer** — business logic is not in React components or route files

## Common pitfalls

- Forgetting to start **channel-service** — launches fail or funnel never updates
- Missing **`GROQ_API_KEY`** — Autopilot/segmentation fails (required by `lib/groq.ts`)
- Assuming **Gemini** powers all AI — only insights use Gemini; segmentation uses Groq
- Treating **empty `rules.and`** as “no customers” — it matches **all** customers (`SegmentEngine` returns `{}`)
- Editing **schema.prisma** without a new migration — check DB matches schema (see migration drift note)

## Recommended reading order

```
1.  README.md
1b. channel-service/README.md + docs/CHANNEL_SERVICE.md
2.  crm/prisma/schema.prisma
3.  crm/types/index.ts + crm/lib/constants.ts
4.  crm/services/segment-engine.ts
5.  crm/services/agent-orchestrator.ts
6.  crm/ai/segmentation.ts + crm/ai/strategy.ts + crm/ai/content.ts
7.  crm/services/campaign-sender.ts
8.  channel-service/src/simulation/simulator.ts
9.  crm/services/receipt.service.ts
10. crm/services/order.service.ts
11. crm/services/campaign.service.ts
12. crm/hooks/use-campaigns.ts
13. crm/app/campaigns/new/page.tsx + crm/app/campaigns/[id]/page.tsx
```

## Files to study first (minimum path)

| Priority | File | Why |
|----------|------|-----|
| 1 | `crm/prisma/schema.prisma` | Data model |
| 2 | `crm/services/segment-engine.ts` | Audience logic |
| 3 | `crm/services/campaign-sender.ts` | Launch pipeline |
| 4 | `crm/services/receipt.service.ts` | Webhook handling |
| 5 | `channel-service/src/simulation/simulator.ts` | Delivery simulation |

---

*Document generated from repository inspection (June 2026). Aligned with `crm/lib/groq.ts` (Groq segmentation) and `crm/lib/gemini-insights.ts` (Gemini insights). Service count, migration count, schema drift, dead prompts, and unused hook claims were verified against the repo at time of writing.*
