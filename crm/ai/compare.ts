import { safeGenerate } from "../lib/groq";
import { cleanJsonString } from "./schemas";

// ---------------------------------------------------------------------------
// Types — facts computed deterministically on the frontend
// ---------------------------------------------------------------------------

export interface ComparisonWinner {
  name: string;
  value: number;
}

export interface ComparisonFacts {
  revenueWinner: ComparisonWinner | null;
  openRateWinner: ComparisonWinner | null;
  ctrWinner: ComparisonWinner | null;
  conversionWinner: ComparisonWinner | null;
  successScoreWinner: ComparisonWinner | null;
  campaigns: { name: string; channel: string }[];
}

export interface CompareInsightsResponse {
  summary: string;
  patterns: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// System prompt — AI interprets validated facts, never calculates winners
// ---------------------------------------------------------------------------

const COMPARE_SYSTEM_PROMPT = `You are an expert CRM marketing analyst.

You will receive validated campaign comparison facts that have already been calculated by the application.

Rules:
- Never invent metrics, percentages, or campaign winners.
- Use only the facts provided.
- Explain why the strongest campaign likely succeeded.
- Identify 2–3 meaningful patterns across the campaigns (e.g. channel performance trends, audience behavior, timing effects).
- Recommend 2–3 actions marketers should take next.
- Keep recommendations practical.
- Keep the response concise.
- Maximum 200 words.
- Professional tone.
- Return valid JSON only.

Return exactly:
{
  "summary": "string",
  "patterns": [
    "string",
    "string"
  ],
  "recommendations": [
    "string",
    "string",
    "string"
  ]
}`;

// ---------------------------------------------------------------------------
// Agent entry point — mirrors runSegmentationAgent() pattern
// ---------------------------------------------------------------------------

export async function runCompareInsightsAgent(
  facts: ComparisonFacts
): Promise<CompareInsightsResponse> {
  const prompt = `${COMPARE_SYSTEM_PROMPT}

Here are the validated campaign comparison facts:

${JSON.stringify(facts, null, 2)}

Please output the raw JSON object.`;

  try {
    const text = await safeGenerate(prompt);
    const cleanJson = cleanJsonString(text);
    const parsed = JSON.parse(cleanJson);

    // Basic shape validation (lightweight — no Zod dep needed for 3 fields)
    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.patterns) ||
      !Array.isArray(parsed.recommendations)
    ) {
      throw new Error("AI returned an unexpected response shape.");
    }

    return {
      summary: parsed.summary,
      patterns: parsed.patterns.map(String),
      recommendations: parsed.recommendations.map(String),
    };
  } catch (error) {
    console.error("Error running CompareInsightsAgent:", error);
    // Graceful fallback — never crash the page
    return {
      summary:
        "Unable to generate AI insights at this time. Please review the comparison table above for campaign performance details.",
      patterns: [
        "Insufficient data to identify cross-campaign patterns.",
      ],
      recommendations: [
        "Review the metrics table to identify top-performing campaigns.",
        "Consider A/B testing message variations on your next campaign.",
        "Monitor channel-specific performance trends over time.",
      ],
    };
  }
}
