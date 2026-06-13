# API Guide — Xeno Mini CRM

This document describes every HTTP API exposed by this repository: the **CRM** (Next.js route handlers) and the **Channel Service** (Express simulator).

**Audience:** New backend developers, internship reviewers, and interviewers evaluating API design.

**Last updated:** June 2026

**Base URLs (local development):**

| Service | Default URL |
|---------|-------------|
| CRM | `http://localhost:3000` |
| Channel Service | `http://localhost:3001` |

**Format:** All CRM and channel-service request/response bodies use **JSON** unless noted otherwise.

**Authentication:** **Not implemented.** All endpoints are publicly accessible. See [Authentication](#authentication).

**Related docs:** [`README.md`](../README.md) (setup), [`ARCHITECTURE.md`](./ARCHITECTURE.md) (system design), [`CHANNEL_SERVICE.md`](./CHANNEL_SERVICE.md) (channel loop design), [`channel-service/README.md`](../channel-service/README.md) (channel setup + API).

---

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Customers API](#customers-api)
  - [Orders API](#orders-api)
  - [Segments API](#segments-api)
  - [Campaigns API](#campaigns-api)
  - [Insights API](#insights-api)
  - [Dashboard API](#dashboard-api)
  - [Webhook API](#webhook-api)
  - [Channel Service API](#channel-service-api)
- [Common Response Patterns](#common-response-patterns)
- [Error Handling Strategy](#error-handling-strategy)
- [Example End-to-End Flows](#example-end-to-end-flows)
- [Common Pitfalls](#common-pitfalls)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)
- [Quick Reference](#quick-reference)

---

# API Overview

## What APIs exist

| Surface | Location | Endpoints |
|---------|----------|-----------|
| **CRM REST API** | `crm/app/api/**/route.ts` | 22 HTTP handlers across 16 route files |
| **Channel Service API** | `channel-service/src/routes/send.routes.ts` | 2 endpoints (`POST /api/send`, `GET /api/health`) |

## How they are organized

CRM routes follow the **Next.js App Router** convention: each `route.ts` file exports named functions (`GET`, `POST`, `DELETE`) that map to HTTP methods. Business logic is delegated to modules in `crm/services/` (and AI modules in `crm/ai/`).

The channel service is a separate Express app. It is called by the CRM during campaign launch and calls back to the CRM webhook endpoint during simulation.

## ASCII overview

```
Browser / curl
      │
      ▼
┌─────────────────────────────────────┐
│  CRM API Routes (crm/app/api/)      │
│  JSON in / JSON out                 │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
  crm/services/*    crm/ai/*
       │                │
       ▼                ▼
  crm/lib/prisma.ts   Groq / Gemini (external)
       │
       ▼
   PostgreSQL

Campaign launch path:
  CampaignSender
       │ POST /api/send (per communication)
       ▼
  Channel Service (Express)
       │ async simulation
       │ POST /api/webhooks/receipt
       ▼
  ReceiptService → OrderService (on converted)
```

---

# Authentication

| Concern | Status |
|---------|--------|
| **Authentication** | Not implemented |
| **Authorization / RBAC** | Not implemented |
| **API keys** | Not implemented |
| **Session / JWT** | Not implemented |

**Evidence:** No `middleware.ts` in `crm/`. No auth checks in any `crm/app/api/**/route.ts` file. No `User` model in `crm/prisma/schema.prisma`.

All endpoints are **publicly accessible** on whatever host runs the app. This aligns with the **Xeno SDE Internship Assignment** scope (local demo). A production deployment must add authentication before exposing real customer data.

---

# API Reference

Unless stated otherwise:

- **Authentication:** Not required
- **Request headers:** `Content-Type: application/json` for bodies with JSON
- **Error shape:** `{ "error": "message" }`

---

## Customers API

### GET `/api/customers`

**File:** `crm/app/api/customers/route.ts`

**Purpose:** List customers with optional search and pagination.

**Authentication:** Not required

**Query parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `limit` | number | No | `50` | Page size (`parseInt`) |
| `offset` | number | No | `0` | Skip count |
| `search` | string | No | `""` | Case-insensitive match on `name`, `email`, or `city` |

**Request body:** None

**Validation rules:** None beyond query parsing.

**Success response — `200 OK`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Aarav Sharma",
      "email": "aarav@example.com",
      "phone": "+9198...",
      "city": "Mumbai",
      "tags": ["vip"],
      "totalOrders": 5,
      "totalSpent": 4200,
      "lastOrderAt": "2026-05-01T00:00:00.000Z",
      "createdAt": "2025-01-15T00:00:00.000Z"
    }
  ],
  "total": 500
}
```

**Error responses:**

| Status | Reason | Example |
|--------|--------|---------|
| `500` | Database or server error | `{ "error": "Internal Server Error" }` |

**Execution flow:**

```
GET /api/customers/route.ts
  → CustomerService.list({ limit, offset, search })
  → prisma.customer.findMany + prisma.customer.count
  → JSON response
```

**Internal dependencies:** `CustomerService` (`crm/services/customer.service.ts`)

---

### POST `/api/customers`

**File:** `crm/app/api/customers/route.ts`

**Purpose:** Create or update a customer by email (upsert).

**Authentication:** Not required

**Request body:**

```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "phone": "+919812345678",
  "city": "Mumbai",
  "tags": ["coffee-lover", "vip"]
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `email` | string | Yes |
| `phone` | string \| null | No |
| `city` | string \| null | No |
| `tags` | string[] | No |

**Validation rules:** Returns `400` if `name` or `email` is missing.

**Success response — `201 Created`:** Full customer record from Prisma upsert.

**Error responses:**

| Status | Reason |
|--------|--------|
| `400` | Missing `name` or `email` |
| `500` | Server/database error |

**Execution flow:**

```
POST route → CustomerService.upsert(body) → prisma.customer.upsert(where: email)
```

**Internal dependencies:** `CustomerService`

---

### POST `/api/customers/upload`

**File:** `crm/app/api/customers/upload/route.ts`

**Purpose:** Bulk import customers from CSV text.

**Authentication:** Not required

**Request body:**

```json
{
  "csvText": "email,name,phone,city,tags\naarav@example.com,Aarav Sharma,+9198...,Mumbai,vip"
}
```

**Validation rules:**

- `csvText` required, must be string
- CSV must have header row + at least one data row
- Headers must include `email` and `name` (case-insensitive)
- Optional columns: `phone`, `city`, `tags` (tags split on space, semicolon, pipe, or newline)

**Success response — `200 OK`:**

```json
{
  "success": true,
  "message": "Successfully processed 42 customers.",
  "errors": ["Row 5: Missing email or name."]
}
```

Per-row failures are collected in `errors`; the request still returns `200` if the handler completes.

**Error responses:**

| Status | Reason |
|--------|--------|
| `400` | Missing `csvText`, empty CSV, or missing required columns |
| `500` | Unhandled exception |

**Execution flow:**

```
POST route
  → parseCSVRow() per line (crm/lib/csv-parser.ts)
  → prisma.customer.upsert per row (direct — no CustomerService)
```

**Notes:** Incomplete rows (`row.length < headers.length`) are silently skipped.

---

## Orders API

### GET `/api/orders`

**File:** `crm/app/api/orders/route.ts`

**Purpose:** List orders with customer and campaign attribution metadata.

**Authentication:** Not required

**Query parameters:**

| Name | Type | Required | Default |
|------|------|----------|---------|
| `limit` | number | No | `50` |
| `offset` | number | No | `0` |

**Success response — `200 OK`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "orderDate": "2026-06-01T00:00:00.000Z",
      "totalAmount": 1500,
      "items": [{ "name": "Ethiopian Beans", "qty": 1, "price": 850 }],
      "storeLocation": "online",
      "attributedCampaignId": "uuid-or-null",
      "customer": { "name": "...", "email": "..." },
      "attributedCampaign": { "name": "...", "channel": "email" }
    }
  ],
  "total": 2100
}
```

**Execution flow:**

```
GET route → OrderService.list() → prisma.order.findMany (with includes)
```

**Internal dependencies:** `OrderService` (`crm/services/order.service.ts`)

---

### POST `/api/orders`

**File:** `crm/app/api/orders/route.ts`

**Purpose:** Create an order and update related customer/campaign aggregates.

**Authentication:** Not required

**Request body:**

```json
{
  "customerId": "uuid",
  "totalAmount": 1500,
  "items": [{ "name": "Coffee Blend", "qty": 1, "price": 1500, "category": "beans" }],
  "orderDate": "2026-06-12T10:00:00.000Z",
  "storeLocation": "online"
}
```

| Field | Type | Required |
|-------|------|----------|
| `customerId` | string | Yes |
| `totalAmount` | number | Yes |
| `items` | array | Yes |
| `orderDate` | string (ISO) \| Date | No (defaults to now) |
| `storeLocation` | string | No |

**Validation rules:** `400` if `customerId`, `totalAmount`, or `items` missing.

**Success response — `201 Created`:** Created order record.

**Execution flow:**

```
POST route
  → OrderService.create() [transaction]
      → find latest communication in 7-day window → attributedCampaignId
      → prisma.order.create
      → update customer totalOrders, totalSpent, lastOrderAt
      → update campaign stats if attributed
```

**Notes:** Attribution uses communications with `sentAt` within 7 days before `orderDate` (`crm/services/order.service.ts`).

---

### POST `/api/orders/upload`

**File:** `crm/app/api/orders/upload/route.ts`

**Purpose:** Bulk import orders from CSV; resolves customer by email.

**Authentication:** Not required

**Request body:**

```json
{
  "csvText": "email,totalAmount,items,storeLocation\naarav@example.com,1500,\"[{\"name\":\"Coffee\",\"qty\":1,\"price\":1500}]\",online"
}
```

**Required CSV columns:** `email`, `totalAmount` (header matching is case-insensitive via `.toLowerCase()` on headers, so `totalAmount` → `totalamount`).

**Optional columns:** `items` (JSON string), `storeLocation` (default `"online"`).

**Success response — `200 OK`:**

```json
{
  "success": true,
  "message": "Successfully processed 10 orders.",
  "errors": ["Row 3 (unknown@x.com): Customer not found in database."]
}
```

**Execution flow:**

```
POST route → prisma.customer.findUnique(by email) → OrderService.create per row
```

---

## Segments API

### GET `/api/segments`

**File:** `crm/app/api/segments/route.ts`

**Purpose:** List all segments, newest first.

**Success response — `200 OK`:** Array of segment objects.

**Execution flow:** `SegmentService.list()` → `prisma.segment.findMany`

---

### POST `/api/segments`

**File:** `crm/app/api/segments/route.ts`

**Purpose:** Create a segment and compute `customerCount` from rules.

**Request body:**

```json
{
  "name": "High-Value Mumbai",
  "description": "Customers in Mumbai with spend > 5000",
  "rules": {
    "and": [
      { "field": "city", "op": "eq", "value": "Mumbai" },
      { "field": "totalSpent", "op": "gt", "value": 5000 }
    ]
  },
  "naturalLanguageQuery": "high spenders in Mumbai",
  "createdBy": "user"
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `rules` | `SegmentRulesJson` | Yes |
| `description` | string | No |
| `naturalLanguageQuery` | string | No |
| `createdBy` | string | No (default `"user"` in service) |

**Allowed rule fields** (from `crm/types/index.ts`): `totalSpent`, `totalOrders`, `lastOrderAt`, `createdAt`, `city`, `daysSinceLastOrder`.

**Success response — `201 Created`:** Segment with computed `customerCount`.

**Execution flow:**

```
POST route → SegmentService.create()
  → SegmentEngine.buildWhereClause(rules)
  → prisma.customer.count
  → prisma.segment.create
```

---

### GET `/api/segments/[id]`

**File:** `crm/app/api/segments/[id]/route.ts`

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string (UUID) | Yes | Segment ID |

**Success response — `200 OK`:** Segment object.

**Error responses:** `404` if not found.

---

### DELETE `/api/segments/[id]`

**File:** `crm/app/api/segments/[id]/route.ts`

**Purpose:** Delete a segment if no campaigns reference it.

**Success response — `200 OK`:**

```json
{
  "success": true,
  "message": "Segment deleted successfully"
}
```

**Error responses:** `500` with message if campaigns reference the segment (`SegmentService.delete` throws).

---

### POST `/api/segments/preview`

**File:** `crm/app/api/segments/preview/route.ts`

**Purpose:** Preview audience size and sample customers for **unsaved** rules.

**Request body:**

```json
{
  "rules": {
    "and": [{ "field": "totalSpent", "op": "gt", "value": 5000 }]
  }
}
```

**Validation:** `400` if `rules` missing.

**Success response — `200 OK`:**

```json
{
  "count": 42,
  "customers": [
    {
      "id": "uuid",
      "name": "...",
      "email": "...",
      "city": "Mumbai",
      "totalOrders": 5,
      "totalSpent": 6200
    }
  ]
}
```

**Notes:** Returns up to **15** customers (`getPreviewCustomers(rules, 15)`).

---

### GET `/api/segments/[id]/preview`

**File:** `crm/app/api/segments/[id]/preview/route.ts`

**Purpose:** Preview customers for a **saved** segment.

**Success response — `200 OK`:**

```json
{
  "segmentId": "uuid",
  "count": 42,
  "customers": []
}
```

**Notes:** `count` comes from stored `segment.customerCount`, not a live recount. Returns up to **20** preview customers.

---

### POST `/api/segments/ai`

**File:** `crm/app/api/segments/ai/route.ts`

**Purpose:** Generate segment rules from natural language via Groq (Llama 3.3 70B).

**Request body:**

```json
{
  "prompt": "Customers in Mumbai who haven't ordered in 60 days"
}
```

**Validation:** `400` if `prompt` missing or not a string.

**Success response — `200 OK`:**

```json
{
  "segmentName": "Mumbai Dormant Customers",
  "description": "...",
  "rules": { "and": [{ "field": "daysSinceLastOrder", "op": "gt", "value": 60 }] },
  "explainAudience": "..."
}
```

**Execution flow:**

```
POST route
  → runSegmentationAgent(prompt)  [crm/ai/segmentation.ts]
  → safeGenerate() [crm/lib/groq.ts]
  → Zod SegmentationResponseSchema
```

**Notes:** On LLM/parse failure, `runSegmentationAgent` returns a fallback segment targeting **all customers** (`rules: { and: [] }`). Does **not** persist to database.

---

## Campaigns API

### GET `/api/campaigns`

**File:** `crm/app/api/campaigns/route.ts`

**Purpose:** List campaigns with segment summary (`name`, `customerCount`).

**Success response — `200 OK`:** Array of campaign objects.

---

### POST `/api/campaigns`

**File:** `crm/app/api/campaigns/route.ts`

**Purpose:** Create a manual draft campaign.

**Request body:**

```json
{
  "name": "Summer Promo",
  "segmentId": "uuid",
  "channel": "email",
  "messageTemplate": "Hi [Name], enjoy 20% off in [City]!",
  "createdBy": "user"
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `segmentId` | string | Yes |
| `channel` | string | Yes (`email`, `sms`, or `whatsapp`) |
| `messageTemplate` | string | Yes |
| `createdBy` | string | No |

**Success response — `201 Created`:** Campaign with `status: "draft"`, empty `stats`, included `segment`.

---

### GET `/api/campaigns/[id]`

**File:** `crm/app/api/campaigns/[id]/route.ts`

**Purpose:** Get one campaign with full segment.

**Error responses:** `404` if not found.

**Notes:** Used by `useCampaign` hook with 2.5s polling while campaign is live.

---

### DELETE `/api/campaigns/[id]`

**File:** `crm/app/api/campaigns/[id]/route.ts`

**Purpose:** Delete campaign and related data.

**Execution flow:**

```
CampaignService.delete()
  → delete communications
  → clear attributedCampaignId on orders
  → delete campaign
```

---

### POST `/api/campaigns/generate`

**File:** `crm/app/api/campaigns/generate/route.ts`

**Purpose:** Run the **AI Autopilot** pipeline: segmentation (Groq) + deterministic strategy/copy → persist draft campaign.

**Request body:**

```json
{
  "goal": "Win back dormant VIP customers in Delhi with 20% off"
}
```

**Validation:** `400` if `goal` missing or not a string.

**Success response — `200 OK`:** `CampaignWorkspacePayload` (from `crm/services/agent-orchestrator.ts`):

```json
{
  "campaignId": "uuid",
  "goal": "...",
  "segmentId": "uuid",
  "segmentName": "...",
  "description": "...",
  "customerCount": 42,
  "aov": 1850,
  "potentialRevenue": 77700,
  "opportunityReasoning": "...",
  "explainAudience": "...",
  "channel": "whatsapp",
  "offer": "20% off coupon",
  "timing": "Send during afternoon peak (1 PM - 3 PM)",
  "explainChannel": "...",
  "explainOffer": "...",
  "explainTiming": "...",
  "subject": "",
  "body": "Hey [Name], ...",
  "explainContent": "...",
  "agentThoughts": [
    {
      "step": "segmentation_generation",
      "agent": "Segmentation Agent",
      "reasoning": "...",
      "timestamp": "2026-06-12T10:00:00.000Z"
    }
  ],
  "status": "draft"
}
```

`status` may be `"failed"` if audience sizing returns 0 after self-correction retries.

**Execution flow:**

```
POST route
  → AgentOrchestrator.generateCampaign(goal)
      → runSegmentationAgent (Groq)
      → SegmentEngine sizing + self-correction loop
      → runStrategyAgent (deterministic)
      → runContentAgent (local NLP)
      → prisma.segment.create + prisma.campaign.create
```

---

### POST `/api/campaigns/[id]/launch`

**File:** `crm/app/api/campaigns/[id]/launch/route.ts`

**Purpose:** Launch a **draft** campaign: resolve audience, personalize messages, create communications, dispatch to channel service.

**Request body:** None

**Success response — `200 OK`:**

```json
{
  "success": true,
  "message": "Campaign launched successfully to 42 recipients.",
  "sentCount": 42
}
```

**Error responses:**

| Status | Reason |
|--------|--------|
| `500` | Campaign not found, not in `draft` status, channel service unreachable, or other launch error |

**Execution flow:**

```
POST route
  → CampaignSender.launch(id)
      → load campaign + segment
      → status: draft → sending
      → SegmentEngine → customer.findMany (full audience)
      → generateBatchMessages (local placeholders)
      → communication.createMany
      → dispatchToChannelService (batches of 20)
      → status: sent (or failed on error)
```

**Notes:**

- The route comment mentions "background" dispatch, but `CampaignSender.launch` **awaits** full dispatch before returning.
- Requires channel service running at `CHANNEL_SERVICE_URL` (default `http://localhost:3001`).
- If audience size is 0, campaign is marked `completed` immediately with `sentCount: 0`.

---

## Insights API

### GET `/api/campaigns/[id]/insights`

**File:** `crm/app/api/campaigns/[id]/insights/route.ts`

**Purpose:** Return AI-assisted or programmatic performance narrative for a campaign.

**Path parameters:** `id` — campaign UUID

**Success response — `200 OK`:**

```json
{
  "insights": "Summary text...\n\n💡 Next Step Suggestion:\nTry A/B testing...",
  "summary": "Summary text...",
  "nextStep": "Try A/B testing...",
  "source": "ai"
}
```

`source` is `"ai"` (Gemini) or `"programmatic"` (fallback).

**Error responses:**

| Status | Behavior |
|--------|----------|
| `404` | Campaign not found |
| `500` | Returns **fallback insight strings** with `source: "programmatic"` (unusual — still HTTP 500) |

**Execution flow:**

```
GET route
  → prisma.campaign.findUnique (with segment)
  → getCampaignInsight() [crm/services/insights.service.ts]
      → cache check (in-memory)
      → generateCampaignInsight() [Gemini] OR buildProgrammaticInsight()
```

**Notes:** Gemini uses model `gemini-2.5-pro` (`crm/lib/gemini-insights.ts`). Requires `GEMINI_API_KEY` for AI source; falls back without it.

---

## Dashboard API

### GET `/api/dashboard/stats`

**File:** `crm/app/api/dashboard/stats/route.ts`

**Purpose:** Aggregate KPIs and recent activity for the home dashboard.

**Authentication:** Not required

**Success response — `200 OK`:**

```json
{
  "summary": {
    "totalCustomers": 500,
    "totalCampaigns": 12,
    "totalOrders": 2100,
    "totalRevenue": 3150000
  },
  "locationSales": [
    { "name": "Online", "orders": 1200, "sales": 1800000 },
    { "name": "Bandra Cafe", "orders": 150, "sales": 225000 }
  ],
  "recentCampaigns": [],
  "recentOrders": []
}
```

**Execution flow:** Six parallel Prisma queries (direct — no service layer).

**Internal dependencies:** `prisma` only

---

## Webhook API

### POST `/api/webhooks/receipt`

**File:** `crm/app/api/webhooks/receipt/route.ts`

**Purpose:** Receive delivery status callbacks from the channel service (or any HTTP client).

**Authentication:** Not required (unsigned — see [Limitations](#limitations))

**Request body:**

```json
{
  "communicationId": "uuid",
  "status": "delivered",
  "timestamp": "2026-06-12T10:30:00.000Z",
  "error": "Simulated delivery failure"
}
```

| Field | Type | Required |
|-------|------|----------|
| `communicationId` | string | Yes |
| `status` | string | Yes |
| `timestamp` | string (ISO) | Yes |
| `error` | string | No (used when `status` is `failed`) |

**Allowed `status` values:** `queued`, `sent`, `delivered`, `opened`, `read`, `clicked`, `converted`, `failed`

**Validation:** `400` if required fields missing or invalid status.

**Success response — `200 OK`:**

```json
{
  "success": true,
  "processed": true
}
```

`processed: false` when callback is ignored (unknown communication, backward transition, or already terminal `failed`).

**Execution flow:**

```
POST route
  → ReceiptService.processCallback(body)
      → load communication
      → STATUS_PRIORITY forward-only check
      → prisma.communication.update
      → if converted: OrderService.create (₹500–₹2500)
      → CampaignService.queueSyncStats (debounced 1.5s)
```

**Internal dependencies:** `ReceiptService`, `OrderService`, `CampaignService`

---

## Channel Service API

Base URL: `http://localhost:3001` (default). Routes mounted at `/api` in `channel-service/src/index.ts`.

**Extended docs:** [`channel-service/README.md`](../channel-service/README.md) (setup, probabilities, troubleshooting) · [`CHANNEL_SERVICE.md`](./CHANNEL_SERVICE.md) (system design)

### POST `/api/send`

**File:** `channel-service/src/controllers/send.controller.ts`

**Purpose:** Accept a message for **simulated** delivery. Returns immediately; simulation runs asynchronously.

**Authentication:** Not required

**Request body:**

```json
{
  "communicationId": "uuid",
  "recipient": {
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "+919812345678"
  },
  "message": "Hi Aarav, enjoy 20% off!",
  "channel": "email",
  "callbackUrl": "http://localhost:3000/api/webhooks/receipt"
}
```

| Field | Type | Required |
|-------|------|----------|
| `communicationId` | string | Yes |
| `recipient` | object | Yes |
| `recipient.name` | string | Yes |
| `recipient.email` | string | Yes when `channel` is `email` |
| `message` | string | Yes |
| `channel` | `"email"` \| `"sms"` \| `"whatsapp"` | Yes |
| `callbackUrl` | string | No (falls back to `CRM_WEBHOOK_URL` env) |

**Success response — `202 Accepted`:**

```json
{
  "status": "Accepted",
  "message": "Message accepted for delivery simulation",
  "communicationId": "uuid"
}
```

**Error responses — `400`:** Missing fields, invalid channel, or invalid recipient.

**Simulation behavior** (`channel-service/src/simulation/simulator.ts` + `probabilities.ts`):

- Starts from implicit `queued`; first callback is for the next state (e.g. `sent`)
- Channel-specific probabilistic transitions with randomized delays (`setTimeout`)
- Email path example: `sent` → `delivered` → `opened` → `clicked` → `converted` (each step probabilistic)
- SMS/WhatsApp use `read` instead of `opened`
- Terminal: `failed`, end without conversion, or `converted`

**Retry behavior** (`channel-service/src/simulation/callback.ts`):

- Up to **3** webhook POST attempts
- Exponential backoff on retries: `2^attempt * 1000` ms (4s, 8s after first failure)
- Retries run in background; do not block simulator chain

**Webhook interaction:**

```
CRM CampaignSender
    │ POST /api/send
    ▼
Channel Service → 202 Accepted
    │ simulateMessage (async)
    │ POST callbackUrl { communicationId, status, timestamp }
    ▼
CRM POST /api/webhooks/receipt
```

---

### GET `/api/health`

**File:** `channel-service/src/controllers/send.controller.ts`

**Purpose:** Health check.

**Success response — `200 OK`:**

```json
{
  "status": "OK",
  "service": "channel-service",
  "timestamp": "2026-06-12T10:00:00.000Z"
}
```

---

# Common Response Patterns

| Status | When used | Example route |
|--------|-----------|---------------|
| `200 OK` | Successful GET, POST actions that don't create resources, uploads, webhooks | `GET /api/customers`, `POST /api/segments/ai` |
| `201 Created` | Resource created | `POST /api/customers`, `POST /api/campaigns` |
| `202 Accepted` | Channel service accepted send for async processing | `POST channel-service/api/send` |
| `400 Bad Request` | Missing/invalid input | All routes with manual validation |
| `404 Not Found` | Resource missing | `GET /api/campaigns/[id]`, insights route |
| `500 Internal Server Error` | Unhandled exception | Any route `catch` block |

**Error body shape (CRM):**

```json
{ "error": "Human-readable message" }
```

**Success wrapper patterns:**

| Pattern | Example |
|---------|---------|
| Raw resource | `POST /api/customers` → customer object |
| `{ items, total }` | `GET /api/customers`, `GET /api/orders` |
| `{ success, message }` | `DELETE` routes, uploads |
| `{ success, message, sentCount }` | `POST /api/campaigns/[id]/launch` |
| `{ success, processed }` | Webhook receipt |

---

# Error Handling Strategy

## API routes

Every CRM route follows the same pattern:

```typescript
try {
  // validate → service → response
} catch (error) {
  console.error("...", error);
  return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
}
```

**Logging:** `console.error` only. No structured logging library.

## Validation failures

Manual `if (!field)` checks return `400` with specific messages. No shared Zod middleware on API routes (Zod is used for AI JSON parsing only).

## AI failures

| Component | Failure | API behavior |
|-----------|---------|--------------|
| Groq segmentation | Parse/LLM error | Fallback segment in `runSegmentationAgent`; still returns `200` from `/api/segments/ai` |
| Groq in Autopilot | Same + self-correction loop | May return workspace with `status: "failed"` |
| Gemini insights | Missing key, rate limit, timeout | `buildProgrammaticInsight()` fallback; insights route may still return `500` with fallback body |

## Channel service failures

| Failure | Behavior |
|---------|----------|
| Invalid payload | `400` from Express |
| Webhook POST fails | Up to 3 retries in `sendCallback` |
| CRM dispatch fails | `CampaignSender` marks individual communication `failed` in DB |

---

# Example End-to-End Flows

## Customer import

```
CSV text in UI
    ↓
POST /api/customers/upload { csvText }
    ↓
parseCSVRow() per line
    ↓
prisma.customer.upsert (by email)
    ↓
{ success, message, errors[] }
    ↓
useCustomers().mutate() refreshes table
```

## AI segment generation

```
Natural language prompt
    ↓
POST /api/segments/ai { prompt }
    ↓
runSegmentationAgent
    ↓
safeGenerate → Groq Llama 3.3 70B
    ↓
cleanJsonString + JSON.parse
    ↓
SegmentationResponseSchema (Zod)
    ↓
Segment JSON (not saved until POST /api/segments)
```

## Campaign generation (Autopilot)

```
Goal string
    ↓
POST /api/campaigns/generate { goal }
    ↓
AgentOrchestrator.generateCampaign
    ├─ Groq segmentation
    ├─ DB sizing + self-correction
    ├─ deterministic strategy (ai/strategy.ts)
    ├─ deterministic content (ai/content.ts → local-nlp-parser.ts)
    └─ prisma segment + campaign create
    ↓
CampaignWorkspacePayload
```

## Campaign launch

```
POST /api/campaigns/[id]/launch
    ↓
CampaignSender.launch
    ├─ customer.findMany (segment rules)
    ├─ generateBatchMessages (local)
    ├─ communication.createMany
    └─ POST channel-service/api/send × N (batches of 20)
    ↓
{ success, sentCount }
    ↓
UI redirects to /campaigns/[id] (polls every 2.5s)
```

## Delivery funnel updates

```
Channel simulator setTimeout chain
    ↓
POST /api/webhooks/receipt (per status)
    ↓
ReceiptService.processCallback
    ├─ update communication
    ├─ converted → OrderService.create
    └─ CampaignService.queueSyncStats (1.5s debounce)
    ↓
GET /api/campaigns/[id] (polled)
GET /api/campaigns/[id]/insights (polled)
    ↓
Funnel UI updates
```

---

# Common Pitfalls

| Pitfall | Evidence | What happens |
|---------|----------|----------------|
| Channel service not running | `campaign-sender.ts` fetches `CHANNEL_SERVICE_URL` | Launch fails or communications marked `failed` |
| Missing `GROQ_API_KEY` | `crm/lib/groq.ts` throws if unset | Autopilot and `/api/segments/ai` fail |
| Missing `DATABASE_URL` | `crm/lib/prisma.ts` | All DB routes return `500` |
| Missing `GEMINI_API_KEY` | `gemini-insights.ts` | Insights use programmatic fallback (`source: "programmatic"`) |
| Empty segment rules `{ and: [] }` | `SegmentEngine` returns `{}` | Matches **all** customers |
| Launching non-draft campaign | `CampaignSender.launch` | Throws: campaign cannot be launched |
| Unsigned webhooks | `webhooks/receipt/route.ts` | Anyone can POST fake delivery events |
| Public APIs | No auth middleware | All data readable/writable via API |
| Insights on 500 | `insights/route.ts` catch | Still returns fallback text but HTTP status is 500 |

---

# Limitations

Based on implementation only:

- **No authentication or authorization**
- **No API versioning** (no `/v1` prefix)
- **No OpenAPI / Swagger** spec in repository
- **No rate limiting** on CRM endpoints
- **No request validation middleware** (manual checks per route)
- **No webhook signature verification**
- **No CORS configuration** on CRM (same-origin browser calls only in typical use); channel service uses open `cors()`
- **Synchronous campaign launch** — HTTP request waits for full dispatch
- **Local-development defaults** for service URLs
- **Insights route returns 500** on unexpected errors even when body contains fallback text

---

# Future Improvements

| Recommendation | Why | Expected benefit | Difficulty |
|----------------|-----|------------------|------------|
| **OpenAPI spec generation** | Document contract formally | Easier integration, client SDKs | Medium |
| **Swagger UI** | Interactive API explorer | Faster onboarding | Easy |
| **Authentication + RBAC** | Public APIs unsafe for PII | Production viability | Medium |
| **API versioning** | Breaking changes without coordination | Safer evolution | Medium |
| **Rate limiting** | Protect AI and upload endpoints | Cost/abuse control | Easy |
| **Zod middleware on routes** | Consistent `400` responses | Fewer invalid DB writes | Medium |
| **Webhook HMAC signatures** | Prevent spoofed conversions | Data integrity | Easy |
| **Async launch via job queue** | Avoid HTTP timeouts | Scale large campaigns | Hard |
| **Return 200 for insights fallback** | Current `500` on fallback is confusing | Clearer client handling | Easy |

---

# Quick Reference

| Method | Endpoint | Purpose | Auth required |
|--------|----------|---------|:-------------:|
| GET | `/api/dashboard/stats` | Dashboard KPIs and recent activity | No |
| GET | `/api/customers` | List/search customers | No |
| POST | `/api/customers` | Upsert customer | No |
| POST | `/api/customers/upload` | CSV customer import | No |
| GET | `/api/orders` | List orders | No |
| POST | `/api/orders` | Create order | No |
| POST | `/api/orders/upload` | CSV order import | No |
| GET | `/api/segments` | List segments | No |
| POST | `/api/segments` | Create segment | No |
| GET | `/api/segments/[id]` | Get segment | No |
| DELETE | `/api/segments/[id]` | Delete segment | No |
| GET | `/api/segments/[id]/preview` | Preview saved segment audience | No |
| POST | `/api/segments/preview` | Preview unsaved rules | No |
| POST | `/api/segments/ai` | AI segment from natural language | No |
| GET | `/api/campaigns` | List campaigns | No |
| POST | `/api/campaigns` | Create draft campaign | No |
| GET | `/api/campaigns/[id]` | Get campaign | No |
| DELETE | `/api/campaigns/[id]` | Delete campaign | No |
| POST | `/api/campaigns/generate` | AI Autopilot generate | No |
| POST | `/api/campaigns/[id]/launch` | Launch campaign | No |
| GET | `/api/campaigns/[id]/insights` | Campaign insights | No |
| POST | `/api/webhooks/receipt` | Delivery status webhook | No |
| POST | `http://localhost:3001/api/send` | Accept message for simulation | No |
| GET | `http://localhost:3001/api/health` | Channel service health | No |

---

*Document generated from repository inspection (June 2026). All endpoints verified against `crm/app/api/**/route.ts` and `channel-service/src/controllers/send.controller.ts`.*
