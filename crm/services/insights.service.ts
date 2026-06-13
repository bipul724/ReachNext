import { getAIService } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Types
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

export interface CampaignInsight {
  summary: string;
  nextStep: string;
  source: "ai" | "programmatic";
}

// ---------------------------------------------------------------------------
// In-memory cache, keyed by campaignId + a hash of the metrics that matter.
// ---------------------------------------------------------------------------
// During a single campaign simulation, the channel-service fires webhook
// callbacks repeatedly, each triggering a debounced syncStats in
// campaign.service.ts. The frontend then polls /insights every ~2.5s.
// Without this cache, every poll during an active simulation would call
// the AI provider for what is effectively the same data. The hash below
// changes only when one of the funnel numbers actually moves, so the AI
// is called once per *meaningful* state change, not once per poll.

const insightCache = new Map<string, { hash: string; insight: CampaignInsight }>();

function hashStats(stats: CampaignStats): string {
  // Matches the agreed cache-key shape: sent-delivered-opened-clicked-converted
  // (opened/read merged, queued/failed/revenue omitted as non-decisive for
  // whether the *narrative* would change — revenue moves 1:1 with
  // convertedOrders in this funnel, so convertedOrders alone is sufficient).
  const openedOrRead = Math.max(stats.opened || 0, stats.read || 0);
  return [stats.sent || 0, stats.delivered || 0, openedOrRead, stats.clicked || 0, stats.convertedOrders || 0].join(
    "-"
  );
}

function getCachedInsight(
  campaignId: string,
  stats: CampaignStats
): CampaignInsight | null {
  const entry = insightCache.get(campaignId);
  if (!entry) return null;
  if (entry.hash !== hashStats(stats)) return null;
  return entry.insight;
}

function setCachedInsight(campaignId: string, stats: CampaignStats, insight: CampaignInsight) {
  insightCache.set(campaignId, { hash: hashStats(stats), insight });
}

// ---------------------------------------------------------------------------
// Programmatic fallback (existing deterministic logic, preserved)
// ---------------------------------------------------------------------------

function buildProgrammaticInsight(
  campaignName: string,
  goal: string,
  stats: CampaignStats
): CampaignInsight {
  const openedOrRead = Math.max(stats.opened || 0, stats.read || 0);

  const deliveryRate = stats.sent > 0 ? stats.delivered / stats.sent : 0;
  const openRate = stats.delivered > 0 ? openedOrRead / stats.delivered : 0;
  const clickRate = openedOrRead > 0 ? stats.clicked / openedOrRead : 0;
  const conversionRate = stats.clicked > 0 ? stats.convertedOrders / stats.clicked : 0;

  let summary = `"${campaignName}" reached ${stats.sent} recipients with a ${(
    deliveryRate * 100
  ).toFixed(1)}% delivery rate. `;
  summary += `${(openRate * 100).toFixed(1)}% of delivered messages were opened or read, and ${(
    clickRate * 100
  ).toFixed(1)}% of those led to a click. `;
  summary += `This resulted in ${stats.convertedOrders} converted order${
    stats.convertedOrders === 1 ? "" : "s"
  } and ₹${stats.conversionRevenue.toLocaleString("en-IN")} in revenue.`;

  let nextStep: string;
  if (openRate < 0.2) {
    nextStep = "Consider A/B testing your subject line or send time to improve open rates.";
  } else if (clickRate < 0.1) {
    nextStep = "Try refining your call-to-action or offer to encourage more clicks.";
  } else if (conversionRate < 0.05) {
    nextStep = "Review your landing page experience to improve post-click conversion.";
  } else {
    nextStep = `Performance is strong for the "${goal}" goal — consider scaling this segment.`;
  }

  return { summary, nextStep, source: "programmatic" };
}

// ---------------------------------------------------------------------------
// Public entry point used by the /insights route
// ---------------------------------------------------------------------------

export async function getCampaignInsight(params: {
  campaignId: string;
  campaignName: string;
  goal: string;
  channel: string;
  segmentName: string;
  stats: CampaignStats;
}): Promise<CampaignInsight> {
  const { campaignId, campaignName, goal, channel, segmentName, stats } = params;

  const cached = getCachedInsight(campaignId, stats);
  if (cached) {
    return cached;
  }

  let insight: CampaignInsight;
  try {
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

    const { text } = await getAIService().callModel({
      task: "campaign_insight",
      userPrompt: prompt,
      temperature: 0.7,
      timeoutMs: 8000,
    });

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.nextStep !== "string" ||
      !parsed.summary.trim() ||
      !parsed.nextStep.trim()
    ) {
      throw new Error("AI response missing required fields");
    }

    insight = {
      summary: parsed.summary.trim(),
      nextStep: parsed.nextStep.trim(),
      source: "ai",
    };
  } catch (error) {
    console.error("AI insight generation failed, falling back:", error);
    insight = buildProgrammaticInsight(campaignName, goal, stats);
  }

  setCachedInsight(campaignId, stats, insight);
  return insight;
}

