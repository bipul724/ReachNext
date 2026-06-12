import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// This file is intentionally separate from `lib/groq.ts` (which wraps the
// Groq/Llama-3.3-70b agent pipeline). This file is the ONLY place Gemini is
// called from, scoped specifically to campaign performance insights.
// ---------------------------------------------------------------------------

export interface CampaignStats {
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  read: number;
  clicked: number;
  failed: number;
  convertedOrders: number;
  conversionRevenue: number;
}

export interface GeneratedInsight {
  summary: string;
  nextStep: string;
}

const GEMINI_TIMEOUT_MS = 8000;
const GEMINI_MODEL = "gemini-2.5-pro";

// ---------------------------------------------------------------------------
// Rate-limit circuit breaker
// ---------------------------------------------------------------------------
// If Gemini returns a 429/quota error, skip calling it for a cooldown
// window. Prevents every poll from every open campaign page from retrying
// an already-throttled API.

const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
let rateLimitedUntil = 0;

export function isRateLimitCooldownActive(): boolean {
  return Date.now() < rateLimitedUntil;
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("quota")
  );
}

// ---------------------------------------------------------------------------
// Core generation call
// ---------------------------------------------------------------------------

export async function generateCampaignInsight(params: {
  campaignName: string;
  goal: string;
  channel: string;
  segmentName: string;
  stats: CampaignStats;
}): Promise<GeneratedInsight> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (isRateLimitCooldownActive()) {
    throw new Error("Gemini is in rate-limit cooldown, skipping call");
  }

  const { campaignName, goal, channel, segmentName, stats } = params;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  // opened + read are aggregated under the same criteria upstream
  // (campaign.service.ts syncStats), so we present them as one
  // "opened/read" figure to avoid double-counting in the prompt.
  const openedOrRead = Math.max(stats.opened || 0, stats.read || 0);

  const prompt = `You are a marketing analytics assistant. Write a short performance report for the following campaign.

Campaign: "${campaignName}"
Goal: ${goal}
Channel: ${channel}
Audience segment: ${segmentName}

Funnel statistics:
- Queued: ${stats.queued}
- Sent: ${stats.sent}
- Delivered: ${stats.delivered}
- Opened/Read: ${openedOrRead}
- Clicked: ${stats.clicked}
- Failed: ${stats.failed}
- Converted orders: ${stats.convertedOrders}
- Conversion revenue: ₹${stats.conversionRevenue}

Respond ONLY with a JSON object (no markdown fences, no preamble) with exactly two keys:
- "summary": a 2-3 sentence plain-English performance summary referencing the campaign's goal, channel, segment, and key funnel numbers. Be honest about sample size — if converted orders are very few (e.g. under 5), note that the percentage is based on a small sample rather than calling it definitively "optimized" or "strong."
- "nextStep": one constructive, actionable next-step suggestion based on where the funnel is weakest, or on what to test next given the sample size.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(prompt, {
      signal: controller.signal,
    } as any);

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.nextStep !== "string" ||
      !parsed.summary.trim() ||
      !parsed.nextStep.trim()
    ) {
      throw new Error("Gemini response missing required fields");
    }

    return {
      summary: parsed.summary.trim(),
      nextStep: parsed.nextStep.trim(),
    };
  } catch (error) {
    if (isRateLimitError(error)) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
