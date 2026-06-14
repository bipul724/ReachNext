import {
  ContentResponseSchema,
  type ContentAgentResponse,
} from "./schemas";
import { localParseGoal } from "./local-nlp-parser";

export type { ContentAgentResponse };

export async function runContentAgent(
  goal: string,
  segmentName: string,
  channel: "email" | "sms" | "whatsapp",
  offer: string,
  metrics?: {
    customerCount: number;
    aov: number;
    potentialRevenue: number;
    dormancyDays?: number;
  }
): Promise<ContentAgentResponse> {
  console.log(`✍️ Running deterministic Content Engine for goal: "${goal}"`);

  const local = localParseGoal(goal);

  return ContentResponseSchema.parse({
    subject: channel === "email" ? local.subject : "",
    body: local.body,
    explainContent: `${local.explainContent} (Note: Programmatic copywriting).`,
  });
}

/**
 * Generates personalized messages for a batch of customers locally.
 * Bypasses Gemini entirely to ensure fast dispatch speeds and avoid 429 rate limit exceptions.
 */
export async function generateBatchMessages(
  customers: { id: string; name: string; city: string | null; totalSpent: number; totalOrders: number }[],
  template: string,
  offer: string,
  channel: "email" | "sms" | "whatsapp"
): Promise<{ customerId: string; message: string }[]> {
  console.log(`✍️ Running high-speed local batch personalization for ${customers.length} customers.`);
  const results: { customerId: string; message: string }[] = [];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    const fallbackCity = customer.city || "your city";
    const numMatch = offer.match(/\d+/);
    const couponCode = numMatch ? `NEXT${numMatch[0]}` : "NEXT15";

    // Replaces placeholders in the actual user template if present, or uses a high-quality fallback
    let message = template
      .replace(/\[Name\]/g, customer.name)
      .replace(/\[City\]/g, fallbackCity)
      .replace(/\[TotalSpent\]/g, `₹${Math.round(customer.totalSpent)}`)
      .replace(/\[TotalOrders\]/g, String(customer.totalOrders));

    // If the template was empty or somehow unmodified, construct a nice default
    if (!message || message === template) {
      if (channel === "email") {
        message = `Hey ${customer.name}, we hope you are doing well in ${fallbackCity}! We wanted to share a special reward with you. Use code ${couponCode} for ${offer} on your next order.`;
      } else {
        message = `Hey ${customer.name}, enjoy ${offer} at ReachNext in ${fallbackCity}! Code: ${couponCode}. Order now: reachnext.co`;
      }
    }

    results.push({
      customerId: customer.id,
      message,
    });
  }

  return results;
}
