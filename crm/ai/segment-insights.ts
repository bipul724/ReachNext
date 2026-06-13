import { safeGenerate } from "../lib/groq";
import { cleanJsonString } from "./schemas";

// ---------------------------------------------------------------------------
// Types — segment performance facts computed deterministically on the backend
// ---------------------------------------------------------------------------

export interface SegmentPerformanceFacts {
  segmentName: string;
  customerCount: number;
  campaignCount: number;
  campaigns: {
    name: string;
    channel: string;
    openRate: number;
    ctr: number;
    conversions: number;
    revenue: number;
  }[];
  aggregates: {
    avgOpenRate: number;
    avgCtr: number;
    totalConversions: number;
    totalRevenue: number;
  };
}

export interface SegmentInsightsResponse {
  insight: string;
  patterns: string[];
  recommendations: string[];
  recommendedChannel: {
    channel: string;
    confidence: string;
    reason: string;
  };
}

// ---------------------------------------------------------------------------
// System prompt — AI interprets validated segment facts
// ---------------------------------------------------------------------------

const SEGMENT_INSIGHTS_PROMPT = `You are an expert CRM marketing analyst.

You will receive validated performance facts for a specific audience segment across multiple campaigns. These facts have already been calculated by the application.

Rules:
- Never invent metrics, percentages, or rankings.
- Use only the facts provided.
- Identify what makes this segment respond well (or poorly) across campaigns.
- Note channel-specific trends if different channels were used.
- Provide 1–2 patterns about this segment's behavior.
- Recommend 1–2 practical next steps for marketers targeting this segment.
- Recommend the best channel for this segment based on the campaign data. State confidence as "High", "Medium", or "Low" and explain why.
- Keep the response concise. Maximum 150 words.
- Professional tone.
- Return valid JSON only.

Return exactly:
{
  "insight": "string",
  "patterns": [
    "string"
  ],
  "recommendations": [
    "string"
  ],
  "recommendedChannel": {
    "channel": "email | sms | whatsapp",
    "confidence": "High | Medium | Low",
    "reason": "string"
  }
}`;

// ---------------------------------------------------------------------------
// Agent entry point — mirrors runSegmentationAgent() pattern
// ---------------------------------------------------------------------------

export async function runSegmentInsightsAgent(
  facts: SegmentPerformanceFacts
): Promise<SegmentInsightsResponse> {
  const prompt = `${SEGMENT_INSIGHTS_PROMPT}

Here are the validated segment performance facts:

${JSON.stringify(facts, null, 2)}

Please output the raw JSON object.`;

  try {
    const text = await safeGenerate(prompt);
    const cleanJson = cleanJsonString(text);
    const parsed = JSON.parse(cleanJson);

    if (
      typeof parsed.insight !== "string" ||
      !Array.isArray(parsed.patterns) ||
      !Array.isArray(parsed.recommendations) ||
      typeof parsed.recommendedChannel !== "object"
    ) {
      throw new Error("AI returned an unexpected response shape.");
    }

    return {
      insight: parsed.insight,
      patterns: parsed.patterns.map(String),
      recommendations: parsed.recommendations.map(String),
      recommendedChannel: {
        channel: String(parsed.recommendedChannel.channel || "email"),
        confidence: String(parsed.recommendedChannel.confidence || "Medium"),
        reason: String(parsed.recommendedChannel.reason || ""),
      },
    };
  } catch (error) {
    console.error("Error running SegmentInsightsAgent:", error);
    return {
      insight:
        "Unable to generate segment insights at this time. Review the campaign performance data above for details.",
      patterns: [
        "Insufficient data to identify segment-level patterns.",
      ],
      recommendations: [
        "Launch additional campaigns targeting this segment to build more performance data.",
      ],
      recommendedChannel: {
        channel: "email",
        confidence: "Low",
        reason: "Defaulting to email due to insufficient data for a confident recommendation.",
      },
    };
  }
}
