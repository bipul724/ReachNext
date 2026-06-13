# Channel Service — Delivery Simulator

Standalone **Express 5** service that stubs email, SMS, and WhatsApp delivery for the [Xeno Mini CRM](../README.md). It does **not** send real messages. Instead it simulates a probabilistic delivery lifecycle and POSTs status webhooks back to the CRM — the same async pattern used by providers like SendGrid or Twilio.

**Related docs:** [API reference](../docs/API.md#channel-service-api) · [Architecture](../docs/ARCHITECTURE.md#channel-service-channel-service) · [CRM webhook handler](../crm/app/api/webhooks/receipt/route.ts)

---

## Why this exists

The assignment requires a **two-service, callback-driven loop**:

1. CRM calls a separate channel service when a campaign launches.
2. Channel service accepts the send immediately (`202 Accepted`).
3. Channel service simulates what “happened” asynchronously (delivered, opened, failed, etc.).
4. CRM ingests webhooks and updates each `Communication` and campaign funnel stats.

This service is deliberately **stateless** (no database). The CRM owns all persistent state.

---

## Quick start

### Prerequisites

- Node.js 20+
- CRM running on `http://localhost:3000` (for webhook callbacks)

### Install and run

```bash
cd channel-service
cp .env.example .env
npm install
npm run dev    # http://localhost:3001
```

### Production build

```bash
npm run build
npm start
```

### Verify

```bash
curl http://localhost:3001/api/health
```

Expected:

```json
{
  "status": "OK",
  "service": "channel-service",
  "timestamp": "..."
}
```

### Test a send (manual)

```bash
curl -X POST http://localhost:3001/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "communicationId": "test-comm-001",
    "recipient": { "name": "Test User", "email": "test@example.com" },
    "message": "Hello from the simulator",
    "channel": "email",
    "callbackUrl": "http://localhost:3000/api/webhooks/receipt"
  }'
```

You should get `202 Accepted` immediately. Watch the channel-service terminal for simulation logs and the CRM terminal for incoming webhooks (requires a matching `Communication` row in the DB for updates to persist).

---

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | `3001` | HTTP listen port |
| `CRM_WEBHOOK_URL` | No | `http://localhost:3000/api/webhooks/receipt` | Fallback callback URL when `callbackUrl` is omitted from the send payload |

See [`.env.example`](.env.example).

The CRM passes `callbackUrl` explicitly on each send from `crm/services/campaign-sender.ts`. The env default is a safety net for manual testing.

---

## API

### `POST /api/send`

Accept a message for simulated delivery. Returns **immediately**; simulation runs in the background.

**Request body:**

```json
{
  "communicationId": "uuid-from-crm-communication-row",
  "recipient": {
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "+919812345678"
  },
  "message": "Hi Aarav, enjoy 15% off your next order!",
  "channel": "email",
  "callbackUrl": "http://localhost:3000/api/webhooks/receipt"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `communicationId` | Yes | Must match `Communication.id` in CRM |
| `recipient.name` | Yes | Used in logs |
| `recipient.email` | Yes when `channel` is `email` | Validated in controller |
| `recipient.phone` | No | Passed through; not validated today |
| `message` | Yes | Final personalised body |
| `channel` | Yes | `"email"` \| `"sms"` \| `"whatsapp"` |
| `callbackUrl` | No | Falls back to `CRM_WEBHOOK_URL` |

**Success — `202 Accepted`:**

```json
{
  "status": "Accepted",
  "message": "Message accepted for delivery simulation",
  "communicationId": "uuid"
}
```

**Errors — `400`:** Missing fields, invalid channel, or invalid recipient.

### `GET /api/health`

Liveness check. Returns `200 OK` with service name and timestamp.

---

## Architecture

```
POST /api/send
    │
    ├─ send.controller.ts     validate payload
    ├─ simulateMessage()      start async (non-blocking)
    └─ return 202 Accepted

simulateMessage()  [simulator.ts]
    │
    └─ transition("queued")
           ├─ probabilities.ts → next status + delayMs
           ├─ setTimeout(delay)
           ├─ callback.ts → POST webhook to CRM
           └─ recurse until terminal
```

### File map

| File | Role |
|------|------|
| `src/index.ts` | Express bootstrap, CORS, JSON parser |
| `src/routes/send.routes.ts` | Route wiring |
| `src/controllers/send.controller.ts` | Validation, trigger simulation, health |
| `src/simulation/simulator.ts` | `setTimeout`-driven state machine |
| `src/simulation/probabilities.ts` | Per-channel transition odds and delays |
| `src/simulation/callback.ts` | Webhook POST with retries |
| `src/types/index.ts` | Payload and status types |
| `src/config/env.ts` | `PORT`, `CRM_WEBHOOK_URL` |

### End-to-end flow with CRM

```
CampaignSender.launch()
    → communication.createMany (status: queued)
    → POST /api/send per communication (batches of 20)
         │
Channel Service
    → 202 Accepted
    → simulate lifecycle
    → POST /api/webhooks/receipt per state change
         │
ReceiptService.processCallback()
    → forward-only status update on Communication
    → on "converted": simulated order
    → CampaignService.queueSyncStats (debounced 1.5s)
```

---

## Simulation model

Each message walks a **channel-specific probabilistic funnel**. At every step, `Math.random()` decides the next state and a random delay before the webhook fires.

### Status values

```typescript
"queued" | "sent" | "delivered" | "opened" | "read" | "clicked" | "converted" | "failed"
```

- **Email** uses `opened` after `delivered`.
- **SMS / WhatsApp** use `read` after `delivered`.
- All channels can reach `clicked` → `converted` or terminate early (user “ignores” the message).
- `failed` can occur at `queued` or `sent` (template/carrier/bounce simulation).

The simulator starts from logical state `queued` and fires the **first webhook for the next state** (e.g. `sent`), not for `queued` itself.

### Email funnel

| From | To | Probability | Delay |
|------|-----|-------------|-------|
| queued | sent | 98% | 200ms – 1s |
| queued | failed | 2% | 100ms |
| sent | delivered | 95% | 1 – 4s |
| sent | failed | 5% | 0.5 – 1.5s |
| delivered | opened | 65% | 5 – 30s |
| delivered | *(end)* | 35% | — |
| opened | clicked | 25% | 3 – 18s |
| opened | *(end)* | 75% | — |
| clicked | converted | 25% | 2 – 10s |
| clicked | *(end)* | 75% | — |

### SMS funnel

| From | To | Probability | Delay |
|------|-----|-------------|-------|
| queued | sent | 99% | 100 – 500ms |
| queued | failed | 1% | 50ms |
| sent | delivered | 92% | 0.5 – 2s |
| sent | failed | 8% | 0.3 – 0.8s |
| delivered | read | 85% | 2 – 12s |
| read | clicked | 12% | 2 – 10s |
| clicked | converted | 25% | 2 – 10s |

### WhatsApp funnel

| From | To | Probability | Delay |
|------|-----|-------------|-------|
| queued | sent | 99% | 100 – 500ms |
| sent | delivered | 96% | 0.5 – 2s |
| delivered | read | 92% | 1.5 – 6.5s |
| read | clicked | 22% | 2 – 10s |
| clicked | converted | 30% | 2 – 10s |

WhatsApp is tuned for higher read and conversion rates than SMS — reflecting typical engagement patterns.

---

## Webhook callbacks

Each state transition POSTs to the CRM:

```json
{
  "communicationId": "uuid",
  "status": "delivered",
  "timestamp": "2026-06-13T10:00:04.500Z"
}
```

On failure:

```json
{
  "communicationId": "uuid",
  "status": "failed",
  "timestamp": "2026-06-13T10:00:01.200Z",
  "error": "Simulated delivery failure"
}
```

### Retry policy (`callback.ts`)

| Attempt | Backoff before retry | Behavior |
|---------|----------------------|----------|
| 1 | — | Immediate POST |
| 2 | 4s (`2² × 1000ms`) | Retry on network/HTTP error |
| 3 | 8s (`2³ × 1000ms`) | Final retry |
| After 3 | — | Log permanent failure; **no dead-letter queue** |

Retries run in the background so they do not block the simulator’s next state transition for that message.

---

## System design: volume, ordering, retries, failures

This is what the assignment evaluates. Current behavior:

### Volume

| Layer | Strategy |
|-------|----------|
| **CRM dispatch** | Batches of **20** parallel `POST /api/send` calls (`campaign-sender.ts`) |
| **Channel accept** | `202` immediately; one in-memory `setTimeout` chain per message |
| **Practical limit** | Tested with ~500 recipients (seed data). No hard cap in code. |

At larger scale, in-memory timers and synchronous CRM launch would become bottlenecks. See [Production path](#production-path) below.

### Ordering

**No ordering guarantee** between webhooks. Independent timer chains and retry backoff can deliver events out of sequence.

The CRM defends with a **status priority ladder** in `ReceiptService`:

```
queued(1) → sent(2) → delivered(3) → opened/read(4) → clicked(5) → converted(6) → failed(7 terminal)
```

Backward or duplicate transitions are ignored. `failed` is terminal.

### Retries

- **Outbound webhooks (this service):** 3 attempts, exponential backoff.
- **Inbound to CRM:** No queue; CRM processes synchronously in the webhook handler.

### Failures

| Failure mode | Who handles it |
|--------------|----------------|
| Invalid send payload | Channel service → `400` |
| Channel service unreachable during launch | CRM marks that `Communication` as `failed` |
| Simulated delivery failure | Channel webhook `status: "failed"` |
| Webhook POST fails after 3 retries | Logged only; CRM never learns that transition |
| CRM process down during webhook | Channel retries may help; otherwise lost |

---

## Integration contract

Types are duplicated in `src/types/index.ts` and `crm/types/index.ts`. Keep them in sync.

**CRM → Channel:** `SendMessagePayload`  
**Channel → CRM:** `DeliveryCallbackPayload`

CRM env vars that must align:

| CRM variable | Channel variable | Purpose |
|--------------|------------------|---------|
| `CHANNEL_SERVICE_URL` | `PORT` + host | Where CRM sends messages |
| `CRM_WEBHOOK_URL` | `CRM_WEBHOOK_URL` | Where channel posts callbacks |

---

## Limitations (by design)

- **No database** — restart loses in-flight simulations
- **No authentication** — any client can call `/api/send`
- **No webhook signing** — CRM accepts callbacks without HMAC verification
- **In-memory timers** — not suitable for serverless; needs a long-running process
- **No rate limiting** — burst traffic creates one timer chain per message
- **No dead-letter queue** — permanently failed callbacks are only logged

---

## Production path

What would change for a real deployment (not implemented):

| Gap | Recommended fix |
|-----|-----------------|
| Lost simulations on restart | **BullMQ** (or similar) with Redis — delayed jobs per state transition |
| Failed callbacks | DLQ + replay tooling |
| Large campaigns | CRM launch queue; channel worker concurrency cap |
| Security | Webhook HMAC (`X-Signature`) shared secret |
| Real delivery | Replace simulator with SendGrid / Twilio / Meta APIs — keep the same callback contract |

BullMQ is **not required** for the assignment. The current `setTimeout` + retry approach demonstrates the callback loop; a queue would add durability and backpressure at the cost of Redis infrastructure.

---

## Deployment notes

| Concern | Guidance |
|---------|----------|
| **Hosting** | Long-running Node process (Railway, Fly.io, ECS). Poor fit for short-lived serverless. |
| **Webhook reachability** | `CRM_WEBHOOK_URL` must be a URL the channel service can reach (not `localhost` in production). |
| **CRM → channel** | Set `CHANNEL_SERVICE_URL` to the deployed channel service URL. |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Launch succeeds but funnel never moves | Channel service not running, or `CHANNEL_SERVICE_URL` wrong |
| Webhooks logged in channel but DB unchanged | `communicationId` not found in CRM (test sends without a DB row) |
| All messages `failed` immediately | CRM cannot reach channel service on port 3001 |
| Funnel stuck at `queued` | Dispatch failed silently — check CRM logs for fetch errors |

**Both services must run** for campaign launch and live funnel updates.

---

## Tech stack

| Dependency | Version | Purpose |
|------------|---------|---------|
| Express | 5.x | HTTP server |
| cors | 2.x | Cross-origin (local dev) |
| dotenv | 17.x | Environment config |
| TypeScript | 6.x | Types |
| ts-node + nodemon | — | Dev workflow |

No Redis, no Prisma, no external APIs.

---

Built as part of the **Xeno SDE Internship Assignment**. See the [root README](../README.md) for full CRM setup.
