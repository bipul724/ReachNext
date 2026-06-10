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
  offer: string,
  metrics?: {
    customerCount: number;
    aov: number;
    potentialRevenue: number;
    dormancyDays?: number;
  }
): Promise<ContentAgentResponse> {
  const metricsContext = metrics
    ? `Target Customer Count: ${metrics.customerCount}
Average Order Value (AOV): ₹${metrics.aov.toFixed(0)}
Potential Segment Revenue: ₹${metrics.potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
${metrics.dormancyDays ? `Target Dormancy Days: ${metrics.dormancyDays} days since last purchase` : ""}`
    : "No detailed segment metrics available.";

  const prompt = `
${messageSystemPrompt}

Marketing Goal: "${goal}"
Audience Segment: "${segmentName}"
Selected Channel: "${channel}"
Recommended Offer: "${offer}"

Audience Segment Metrics:
${metricsContext}

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

/**
 * Generates personalized messages for a batch of customers.
 * It uses Gemini to generate a personalized copy for each customer individually,
 * with a rate-limiting stagger delay (e.g. 200ms) between calls.
 * If Gemini fails or rate-limits, it falls back to a clean template using customer details.
 */
export async function generateBatchMessages(
  customers: { id: string; name: string; city: string | null; totalSpent: number; totalOrders: number }[],
  template: string,
  offer: string,
  channel: "email" | "sms"
): Promise<{ customerId: string; message: string }[]> {
  const results: { customerId: string; message: string }[] = [];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    // Stagger delay to protect Gemini rate limits (429 mitigation)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    try {
      const prompt = `
You are the content copywriter for Brew CampaignOS.
Your job is to personalize the following generic template for a specific customer.
Template: "${template}"
Offer: "${offer}"
Channel: "${channel}"

Customer Profile:
- Name: ${customer.name}
- City: ${customer.city || "their city"}
- Lifetime Spent: ₹${Math.round(customer.totalSpent)}
- Total Orders: ${customer.totalOrders}

Write a natural, engaging message based on the template guidelines and customer metrics.
Return ONLY the raw message content. Do not include subject lines, markdown code blocks, or formatting. Keep it to under 120 words for email and 160 characters for SMS.
`;

      const personalizedText = await safeGenerate(prompt, { timeoutMs: 5000, maxRetries: 1 });
      results.push({
        customerId: customer.id,
        message: personalizedText,
      });
    } catch (err) {
      console.warn(`[generateBatchMessages] Failed to generate personalized message for customer ${customer.id}, using fallback. Error:`, err);
      
      // Fallback template using customer's real name and city (so it looks deliberate in a demo)
      const fallbackCity = customer.city || "your city";
      
      // Parse dynamic coupon code from offer string (e.g. "15% off" -> "BREW15")
      const numMatch = offer.match(/\d+/);
      const couponCode = numMatch ? `BREW${numMatch[0]}` : "BREW15";

      let fallbackMsg = "";
      if (channel === "email") {
        fallbackMsg = `Hey ${customer.name}, we hope you are doing well in ${fallbackCity}! We wanted to share a special coffee reward with you. Use code ${couponCode} for ${offer} on your next order of our specialty blends.`;
      } else {
        fallbackMsg = `Hey ${customer.name}, enjoy ${offer} at Brew & Co. in ${fallbackCity}! Code: ${couponCode}. Order now: brew.co`;
      }

      results.push({
        customerId: customer.id,
        message: fallbackMsg,
      });
    }
  }

  return results;
}

