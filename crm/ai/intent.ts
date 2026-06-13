import { getAIService } from "../lib/ai";
import { IntentValidationResponseSchema, IntentValidationResponse, cleanJsonString } from "./schemas";

/**
 * Layer 1: Deterministic Filters
 * Rejects obvious invalid inputs (empty, emoji-only, keyboard mash).
 */
function isObviouslyInvalid(goal: string): boolean {
  const trimmed = goal.trim();
  if (!trimmed) return true;
  
  // Emoji-only check
  const emojiRegex = /^[\p{Emoji}\s]+$/u;
  if (emojiRegex.test(trimmed)) return true;

  // Too short to be meaningful
  const words = trimmed.split(/\s+/);
  if (words.length < 2 && trimmed.length < 5) return true;

  // Keyboard mashing or repetitive chars (e.g., asdfghjkl, ;;;;;;;;, ......)
  const mashRegex = /^(?:asdf|qwer|zxcv|1234)/i;
  if (mashRegex.test(trimmed)) return true;
  if (/^(.)\1{4,}$/.test(trimmed)) return true;

  return false;
}

/**
 * Layer 2: Simple Intent Matcher
 * Identifies high-confidence shorthand based on keywords.
 */
function attemptDeterministicMatch(goal: string): IntentValidationResponse | null {
  const lower = goal.toLowerCase();
  
  const hasVIP = /(vip|premium|loyal)/.test(lower);
  const hasReengage = /(inactive|old customer|churn|come back)/.test(lower);
  const hasPromo = /(discount|offer|coupon|voucher)/.test(lower);
  const hasRetention = /(repeat purchase|retain|loyalty)/.test(lower);
  const hasMessaging = /(email|sms|whatsapp|msg|send)/.test(lower);

  // If it's a solid combination of action + target, skip LLM
  if ((hasVIP || hasReengage || hasRetention) && (hasPromo || hasMessaging)) {
    return {
      normalizedGoal: goal,
      confidenceScore: 0.95,
      explanation: "Intent detected through deterministic pattern matching.",
    };
  }
  
  return null;
}

/**
 * Layer 3: LLM Intent Validator
 */
export async function runIntentValidationAgent(goal: string): Promise<IntentValidationResponse> {
  // Layer 1
  if (isObviouslyInvalid(goal)) {
    return {
      normalizedGoal: goal,
      confidenceScore: 0.1, // Very low confidence
      explanation: "Input rejected by deterministic filters (empty, gibberish, or insufficient detail).",
    };
  }

  // Layer 2
  const deterministicMatch = attemptDeterministicMatch(goal);
  if (deterministicMatch) {
    return deterministicMatch;
  }

  // Layer 3
  const prompt = `
You are the Goal Validation Agent for an AI CRM.
Your job is to determine if the user's prompt is a valid marketing objective.

Rules:
1. Accept broken English, shorthand, and typos if the core marketing intent is clear.
2. Reject vague requests (e.g., "help", "campaign", "do something", "increase revenue").
3. Detect contradictions or impossible goals without context.
4. Output a confidenceScore between 0.0 and 1.0.
   - < 0.30: Gibberish, completely vague, or non-marketing requests.
   - 0.30 - 0.60: Plausible but missing key details (requires confirmation).
   - > 0.60: Clear marketing intent (even if written in shorthand).
5. Output normalizedGoal: Rewrite the prompt into a clear, professional marketing objective if possible. If completely vague, just repeat it.
6. Output explanation: Briefly explain why you assigned this confidence score.

User Prompt: "${goal}"

Output ONLY a valid JSON object matching this schema exactly:
{
  "normalizedGoal": "string",
  "confidenceScore": number,
  "explanation": "string"
}
`;

  try {
    const { text } = await getAIService().callModel({
      task: "intent_validation",
      userPrompt: prompt,
      temperature: 0.1,
    });
    
    const parsed = JSON.parse(cleanJsonString(text));
    return IntentValidationResponseSchema.parse(parsed);
  } catch (error) {
    console.error("LLM Intent Validation failed, defaulting to low confidence.", error);
    return {
      normalizedGoal: goal,
      confidenceScore: 0.2,
      explanation: "Fallback due to validation parsing error.",
    };
  }
}
