// ---------------------------------------------------------------------------
// DEPRECATED — Use `import { getAIService } from "./ai"` instead.
//
// This module is preserved for backward compatibility. All calls are now
// routed through the centralized AI service. It will be removed in a future
// release.
// ---------------------------------------------------------------------------

import { getAIService } from "./ai";

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

/**
 * @deprecated Use `getAIService().callModel({ task: "campaign_insight", ... })` instead.
 */
export async function generateCampaignInsight(params: {
  campaignName: string;
  goal: string;
  channel: string;
  segmentName: string;
  stats: CampaignStats;
}): Promise<GeneratedInsight> {
  console.warn(
    "⚠️ Deprecated: generateCampaignInsight() is deprecated. Use getAIService().callModel() instead."
  );

  const { campaignName, goal, channel, segmentName, stats } = params;
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

  return {
    summary: parsed.summary.trim(),
    nextStep: parsed.nextStep.trim(),
  };
}

// ---------------------------------------------------------------------------
// Revenue Opportunity Copilot Explanations
// ---------------------------------------------------------------------------

export interface OpportunityInput {
  type: "DORMANT_VIP" | "CROSS_SELL" | "CHANNEL_OPT";
  affectedCustomers: number;
  estimatedRevenue: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  suggestedGoal: string;
  historicalSpend: number;
}

export interface OpportunityOutput {
  type: "DORMANT_VIP" | "CROSS_SELL" | "CHANNEL_OPT";
  title: string;
  whyItMatters: string;
  recommendedAction: string;
  suggestedGoal: string;
}

/**
 * @deprecated Use `getAIService().callModel({ task: "opportunity_explanations", ... })` instead.
 */
export async function generateOpportunityExplanations(
  opportunities: OpportunityInput[]
): Promise<OpportunityOutput[]> {
  console.warn(
    "⚠️ Deprecated: generateOpportunityExplanations() is deprecated. Use getAIService().callModel() instead."
  );

  const prompt = `You are a marketing strategist.
Below is a list of deterministic customer opportunities discovered in our database:

${JSON.stringify(opportunities, null, 2)}

For each opportunity in the input list, write:
1. "title": A short, marketing-focused, catchy title.
2. "whyItMatters": A 1-2 sentence explanation of why this opportunity represents high value or customer leakage.
3. "recommendedAction": A 1-sentence recommendation on how the marketer should act (e.g. offering a specific discount or channel choice).
4. "suggestedGoal": A clear, marketer-friendly campaign goal that can be used directly as a prompt for our campaign generator. Keep it action-oriented (e.g. "Win back dormant VIP customers in Mumbai with a 20% WhatsApp offer").

Rules:
- Keep the explanations focused entirely on B2C consumer behavior.
- Do NOT change the opportunity "type" (must match the input "type" exactly).
- Do NOT include any formatting like markdown fences (e.g., \`\`\`json) or text other than the raw JSON object.
- Output exactly a JSON object with this schema:
{
  "opportunities": [
    {
      "type": "DORMANT_VIP | CROSS_SELL | CHANNEL_OPT",
      "title": "...",
      "whyItMatters": "...",
      "recommendedAction": "...",
      "suggestedGoal": "..."
    }
  ]
}
`;

  const { text } = await getAIService().callModel({
    task: "opportunity_explanations",
    userPrompt: prompt,
    temperature: 0.7,
    timeoutMs: 8000,
  });

  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.opportunities || !Array.isArray(parsed.opportunities)) {
    throw new Error("AI response missing opportunities array");
  }

  return parsed.opportunities as OpportunityOutput[];
}

