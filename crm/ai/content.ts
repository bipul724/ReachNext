import { safeGenerate } from "../lib/gemini";
import { messageSystemPrompt } from "./prompts/message.prompt";
import {
  ContentResponseSchema,
  cleanJsonString,
  type ContentAgentResponse,
} from "./schemas";

export type { ContentAgentResponse };

export async function runContentAgent(
  goal: string,
  segmentName: string,
  channel: "email" | "sms",
  offer: string
): Promise<ContentAgentResponse> {
  const prompt = `
${messageSystemPrompt}

Marketing Goal: "${goal}"
Audience Segment: "${segmentName}"
Selected Channel: "${channel}"
Recommended Offer: "${offer}"

Please draft the message copy and return the raw JSON object.
`;

  try {
    const text = await safeGenerate(prompt);
    const cleanJson = cleanJsonString(text);
    const parsed = JSON.parse(cleanJson);

    // Validate with Zod — applies defaults for any missing fields
    return ContentResponseSchema.parse(parsed);
  } catch (error) {
    console.error("Error running ContentAgent:", error);
    // Return a safe default fallback message
    return {
      subject:
        channel === "email" ? "A special message from Brew & Co." : "",
      body: "Hey [Name], we hope you are doing well! Check out our latest selection at Brew & Co.",
      explainContent:
        "Fallback message template generated due to parsing error.",
    };
  }
}
