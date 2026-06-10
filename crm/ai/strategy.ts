import { safeGenerate } from "../lib/gemini";
import { strategySystemPrompt } from "./prompts/strategy.prompt";
import {
  StrategyResponseSchema,
  cleanJsonString,
  type StrategyAgentResponse,
} from "./schemas";

export type { StrategyAgentResponse };

export async function runStrategyAgent(
  goal: string,
  segmentName: string,
  segmentDescription: string,
  customerCount: number,
  potentialRevenue: number,
  aov: number
): Promise<StrategyAgentResponse> {
  const prompt = `
${strategySystemPrompt}

Marketing Goal: "${goal}"
Audience Segment: "${segmentName}" (${segmentDescription})
Customer Count: ${customerCount}
Average Customer AOV: ₹${aov.toFixed(2)}
Estimated Total Revenue Pool: ₹${potentialRevenue.toFixed(2)}

Please output the raw JSON object recommendation.
`;

  try {
    const text = await safeGenerate(prompt);
    const cleanJson = cleanJsonString(text);
    const parsed = JSON.parse(cleanJson);

    // Validate with Zod — coerces invalid channel values to "email"
    return StrategyResponseSchema.parse(parsed);
  } catch (error) {
    console.error("Error running StrategyAgent:", error);
    // Return a safe default fallback
    return {
      channel: "email",
      offer: "None",
      timing: "Immediately",
      explainChannel: "Fallback to email due to parsing error.",
      explainOffer: "No discount offered as fallback.",
      explainTiming: "Send immediately.",
    };
  }
}
