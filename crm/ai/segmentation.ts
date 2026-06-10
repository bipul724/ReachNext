import { safeGenerate } from "../lib/gemini";
import { segmentSystemPrompt } from "./prompts/segment.prompt";
import {
  SegmentationResponseSchema,
  cleanJsonString,
  type SegmentationAgentResponse,
} from "./schemas";

export type { SegmentationAgentResponse };

export async function runSegmentationAgent(
  goal: string
): Promise<SegmentationAgentResponse> {
  const prompt = `
${segmentSystemPrompt}

User Goal: "${goal}"

Please output the raw JSON object.
`;

  try {
    const text = await safeGenerate(prompt);
    const cleanJson = cleanJsonString(text);
    const parsed = JSON.parse(cleanJson);

    // Validate with Zod — applies defaults for any missing fields
    return SegmentationResponseSchema.parse(parsed);
  } catch (error) {
    console.error("Error running SegmentationAgent:", error);
    // Return a default fallback segment
    return {
      segmentName: "All Customers (Fallback)",
      description: "Fallback segment due to parsing error",
      rules: { and: [] },
      explainAudience:
        "The AI agent failed to parse, falling back to all customers.",
    };
  }
}
