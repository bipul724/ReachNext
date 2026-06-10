import { z } from "zod";

// --- Shared JSON cleaning utility ---

/**
 * Strips markdown code block fences from LLM output.
 * Handles ```json\n...\n```, ```\n...\n```, and edge cases.
 */
export function cleanJsonString(str: string): string {
  let clean = str.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```[a-zA-Z]*\n?/, "");
    clean = clean.replace(/\n?```$/, "");
  }
  return clean.trim();
}

// --- Zod Schemas ---

const SegmentRuleSchema = z.object({
  field: z.enum(["totalSpent", "totalOrders", "lastOrderAt", "createdAt", "city", "daysSinceLastOrder"]),
  op: z.enum(["gt", "lt", "gte", "lte", "eq", "contains"]),
  value: z.union([z.string(), z.number()]),
});

const SegmentRulesJsonSchema = z.object({
  and: z.array(SegmentRuleSchema),
});

export const SegmentationResponseSchema = z.object({
  segmentName: z.string().default("All Customers (Fallback)"),
  description: z.string().default("AI-generated segment"),
  rules: SegmentRulesJsonSchema.default({ and: [] }),
  explainAudience: z.string().default("No explanation provided."),
});

export const StrategyResponseSchema = z.object({
  channel: z
    .enum(["email", "sms"])
    .default("email")
    .catch("email"),
  offer: z.string().default("None"),
  timing: z.string().default("Immediately"),
  explainChannel: z.string().default("No explanation provided."),
  explainOffer: z.string().default("No explanation provided."),
  explainTiming: z.string().default("No explanation provided."),
});

export const ContentResponseSchema = z.object({
  subject: z.string().default(""),
  body: z
    .string()
    .default(
      "Hey [Name], we hope you are doing well! Check out our latest selection at Brew & Co."
    ),
  explainContent: z.string().default("No explanation provided."),
});

// --- Inferred types ---

export type SegmentationAgentResponse = z.infer<typeof SegmentationResponseSchema>;
export type StrategyAgentResponse = z.infer<typeof StrategyResponseSchema>;
export type ContentAgentResponse = z.infer<typeof ContentResponseSchema>;
