# Channel Service — System Design Reference

Deep-dive companion to [`channel-service/README.md`](../channel-service/README.md). Covers the callback loop, reliability choices, and how this maps to the assignment problem statement.

---

## Problem statement alignment

The assignment asks for:

> A separate stubbed channel service that simulates outcomes and calls back into a CRM receipt API. How you handle **volume, ordering, retries, and failures** in this loop is exactly the kind of system-design thinking we want to see.

| Requirement | Implementation |
|-------------|----------------|
| Separate service | `channel-service/` — Express process on port 3001 |
| No real provider | Probabilistic state machine in `simulation/` |
| Async acceptance | `202 Accepted` in `send.controller.ts` before simulation starts |
| Full lifecycle | `sent` → `delivered` → `opened`/`read` → `clicked` → `converted` or `failed` |
| CRM receipt API | `POST /api/webhooks/receipt` → `ReceiptService` |
| State + stats update | `Communication` row + debounced `CampaignService.syncStats` |

---

## Sequence diagram (single message)

```
CampaignSender          Channel Service              CRM
      │                        │                      │
      │ POST /api/send         │                      │
      │───────────────────────>│                      │
      │ 202 Accepted           │                      │
      │<───────────────────────│                      │
      │                        │                      │
      │                   [setTimeout]                │
      │                        │ POST /webhooks/receipt│
      │                        │ { status: "sent" }   │
      │                        │─────────────────────>│
      │                        │                      │ ReceiptService
      │                        │ POST { delivered }   │
      │                        │─────────────────────>│
      │                        │ ...                  │
      │                        │ POST { converted }   │
      │                        │─────────────────────>│
      │                        │                      │ OrderService.create
      │                        │                      │ queueSyncStats
```

---

## Component responsibilities

### Channel service (stateless)

| Component | Responsibility |
|-----------|----------------|
| `send.controller.ts` | Validate, enqueue simulation, return `202` |
| `simulator.ts` | Drive state machine via recursive `setTimeout` |
| `probabilities.ts` | Channel-specific odds and delay ranges |
| `callback.ts` | Deliver webhooks to CRM with retry/backoff |

### CRM (stateful)

| Component | Responsibility |
|-----------|----------------|
| `campaign-sender.ts` | Create `Communication` rows, batch dispatch to channel |
| `webhooks/receipt/route.ts` | HTTP entry for callbacks |
| `receipt.service.ts` | Ordering guard, timestamp fields, conversion side effects |
| `campaign.service.ts` | Aggregate funnel stats from communication statuses |

---

## Volume handling

### Outbound: CRM → Channel

```typescript
// crm/services/campaign-sender.ts
const batchSize = 20;
for (let i = 0; i < communications.length; i += batchSize) {
  const batch = communications.slice(i, i + batchSize);
  await Promise.all(batch.map(comm => fetch(`${CHANNEL_SERVICE_URL}/api/send`, ...)));
  await CampaignService.syncStats(campaignId);
}
```

- **Why batch?** Limits concurrent HTTP connections to the channel service.
- **Trade-off:** Launch API blocks until all batches complete (synchronous launch).
- **At scale:** Move dispatch to a background worker queue; return `202` from launch API.

### Inbound: Channel internal

- One independent timer chain per `communicationId`.
- 500-recipient campaign ≈ 500 concurrent chains in one Node process.
- **At scale:** Worker pool with concurrency limit (e.g. BullMQ `concurrency: 50`).

---

## Ordering handling

### Channel side: none

Each message’s transitions are sequential **within** that message, but:

- Different messages interleave arbitrarily.
- Retry backoff on webhook `N` can cause webhook `N+1` to arrive first (rare for same message since retries block the chain only for that callback await — actually looking at simulator.ts, it `await sendCallback` before recursing, so within one message transitions are sequential. But **across messages** there's no ordering, and **retries of the same status** could duplicate if CRM processed first attempt slowly...)

Within a single message in `simulator.ts`:

```typescript
setTimeout(async () => {
  await sendCallback(callbackUrl, callbackPayload);  // waits for this POST (incl. retries)
  transition(next.status);                           // then schedules next
}, next.delayMs);
```

So per-message transitions are strictly ordered. Cross-message ordering is undefined.

### CRM side: priority ladder

```typescript
// crm/services/receipt.service.ts
const STATUS_PRIORITY = {
  queued: 1, sent: 2, delivered: 3,
  read: 4, opened: 4, clicked: 5, converted: 6, failed: 7,
};
```

| Scenario | Behavior |
|----------|----------|
| `delivered` arrives after `clicked` | Ignored (backward) |
| Duplicate `sent` | Ignored (same priority) |
| Already `failed` | All further callbacks ignored |
| Unknown `communicationId` | Warning logged; `processed: false` |

**Not implemented:** Idempotency keys, webhook signatures, exactly-once delivery.

---

## Retry handling

### Channel → CRM (`callback.ts`)

```
Attempt 1: immediate
Attempt 2: wait 4s, retry
Attempt 3: wait 8s, retry
After 3:   log error, drop
```

Retries are fire-and-forget on failure (`sendCallback(...).catch()`), so the parent `await` in simulator may resolve before retries complete — but the next state transition only starts after the first attempt finishes (success or final failure path starts async retries without blocking transition...)

Actually re-read callback.ts - on failure with attempts left, it calls `sendCallback` recursively in background WITHOUT awaiting in the catch block. So `await sendCallback` in simulator resolves after attempt 1 fails, and transition to next state can proceed **while retries for previous state are still running**. This could cause out-of-order delivery for the **same message** if attempt 1 fails but attempt 2 succeeds later after next state already fired.

This is a subtle bug/limitation worth documenting honestly.

### CRM → Channel (dispatch)

No retry. Single `fetch` per communication. On failure → mark `Communication` as `failed` in CRM.

---

## Failure modes matrix

| Event | Channel behavior | CRM behavior |
|-------|------------------|--------------|
| Bad payload | `400` response | N/A |
| Channel down at launch | N/A | `Communication.status = failed` |
| Simulated carrier failure | Webhook `failed` | Terminal state via ReceiptService |
| CRM down during webhook | Retry 3×, then drop | No update |
| Webhook spoofing | N/A | Accepted (no signature check) |

---

## Why not BullMQ (current scope)

| Approach | Pros | Cons |
|----------|------|------|
| **Current (`setTimeout`)** | Zero infra, easy local dev, demonstrates pattern | Lost on restart, no DLQ, poor serverless fit |
| **BullMQ + Redis** | Durable delays, retries, DLQ, concurrency control | Requires Redis, more moving parts |

**Recommendation for assignment:** Current approach is sufficient if documented. Add BullMQ only if you can implement it cleanly in the channel service (simulation + callback queues) and explain the trade-off in README.

---

## Callback payload contract

**Channel → CRM** (`DeliveryCallbackPayload`):

```typescript
{
  communicationId: string;
  status: CommunicationStatus;
  timestamp: string;      // ISO 8601
  error?: string;         // when status === "failed"
}
```

**CRM → Channel** (`SendMessagePayload`):

```typescript
{
  communicationId: string;
  recipient: { name: string; email: string; phone?: string | null };
  message: string;
  channel: "email" | "sms" | "whatsapp";
  callbackUrl?: string;
}
```

Types live in both `channel-service/src/types/index.ts` and `crm/types/index.ts`.

---

## Funnel stats aggregation (CRM)

`CampaignService.syncStats` uses **cumulative** counts — each stage includes communications that reached that stage or beyond:

```
sent      = count(status in [sent, delivered, opened, read, clicked, converted])
delivered = count(status in [delivered, opened, read, clicked, converted])
clicked   = count(status in [clicked, converted])
failed    = count(status === failed) only
```

Email `opened` and SMS/WhatsApp `read` are merged in the `opened`/`read` stat fields for cross-channel UI display.

---

## Related files (reading order)

1. [`channel-service/README.md`](../channel-service/README.md) — setup and API
2. [`channel-service/src/controllers/send.controller.ts`](../channel-service/src/controllers/send.controller.ts)
3. [`channel-service/src/simulation/simulator.ts`](../channel-service/src/simulation/simulator.ts)
4. [`channel-service/src/simulation/probabilities.ts`](../channel-service/src/simulation/probabilities.ts)
5. [`channel-service/src/simulation/callback.ts`](../channel-service/src/simulation/callback.ts)
6. [`crm/services/campaign-sender.ts`](../crm/services/campaign-sender.ts)
7. [`crm/services/receipt.service.ts`](../crm/services/receipt.service.ts)
8. [`crm/app/api/webhooks/receipt/route.ts`](../crm/app/api/webhooks/receipt/route.ts)

---

See also: [ARCHITECTURE.md — Webhook Architecture](./ARCHITECTURE.md#webhook-architecture) · [API.md — Channel Service API](./API.md#channel-service-api)
