import { StrategyResponseSchema, type StrategyAgentResponse } from "./schemas";

export type { StrategyAgentResponse };

export async function runStrategyAgent(
  goal: string,
  segmentName: string,
  segmentDescription: string,
  customerCount: number,
  potentialRevenue: number,
  aov: number
): Promise<StrategyAgentResponse> {
  console.log(`🎯 Running deterministic Strategy Engine for segment: "${segmentName}"`);

  const lowercaseGoal = goal.toLowerCase();
  const lowercaseDesc = segmentDescription.toLowerCase();

  // 1. Parse dormancy days from description or goal
  const daysMatch = lowercaseDesc.match(/(\d+)\s*days?/i) || lowercaseGoal.match(/(\d+)\s*days?/i);
  const dormancyDays = daysMatch ? parseInt(daysMatch[1], 10) : 0;

  const isDormant = dormancyDays > 0 || lowercaseGoal.includes("inactive") || lowercaseGoal.includes("dormant");
  const isVIP = lowercaseGoal.includes("vip") || lowercaseGoal.includes("high spent") || lowercaseGoal.includes("high-value") || aov >= 3000 || lowercaseGoal.includes("reward");

  let channel: "email" | "sms" | "whatsapp" = "email";
  let offer = "None";
  let timing = "Send during afternoon peak (1 PM - 3 PM)";
  let explainChannel = "Email is selected to provide a detailed, premium visual update of our latest menu.";
  let explainOffer = "No financial discount is needed for this active engagement segment.";
  let explainTiming = "Sent during high-conversion windows matching peak customer activity.";

  if (isDormant) {
    // Recommend WhatsApp for moderate dormancy or if explicitly requested; otherwise SMS for high dormancy
    if (lowercaseGoal.includes("whatsapp") || lowercaseGoal.includes("whats app") || (dormancyDays > 0 && dormancyDays < 60)) {
      channel = "whatsapp";
      explainChannel = "WhatsApp is recommended for its extremely high (92%+) read rate and interactive engagement for mid-term dormant customers.";
      if (dormancyDays >= 60 || lowercaseGoal.includes("win back") || lowercaseGoal.includes("winback")) {
        offer = "20% off coupon";
        explainOffer = "A higher incentive of 20% off is offered to win back highly dormant shoppers.";
      } else {
        offer = "15% off coupon";
        explainOffer = "A 15% off coupon is offered to nudge moderately dormant customers to purchase.";
      }
      timing = "Send immediately";
      explainTiming = "Dispatched immediately to capture active attention on mobile.";
    } else {
      channel = "sms";
      explainChannel = "SMS has a 98% open rate, which is ideal for re-engaging highly dormant customers.";
      if (dormancyDays >= 60 || lowercaseGoal.includes("win back") || lowercaseGoal.includes("winback")) {
        offer = "20% off coupon";
        explainOffer = "A higher incentive of 20% off is offered to win back highly dormant shoppers.";
      } else {
        offer = "15% off coupon";
        explainOffer = "A 15% off coupon is offered to nudge moderately dormant customers to purchase.";
      }
      timing = "Send immediately";
      explainTiming = "Dispatched immediately to capture active attention and drive quick return traffic.";
    }
  } else if (isVIP) {
    if (lowercaseGoal.includes("whatsapp") || lowercaseGoal.includes("whats app")) {
      channel = "whatsapp";
      explainChannel = "WhatsApp is selected as requested to deliver a rich-media VIP reward experience.";
    } else {
      channel = "email";
      explainChannel = "Email allows a premium, high-fidelity experience to preserve VIP brand perception.";
    }
    offer = "Free Coffee Voucher";
    explainOffer = "An exclusive complimentary voucher is rewarded to appreciate lifetime value without diluting pricing.";
    timing = "Friday evening (5 PM - 7 PM)";
    explainTiming = "Timed for the weekend leisure window to maximize premium conversion rates.";
  } else if (lowercaseGoal.includes("whatsapp") || lowercaseGoal.includes("whats app") || lowercaseGoal.includes("instant")) {
    channel = "whatsapp";
    explainChannel = "WhatsApp is recommended as explicitly requested in the goal, leveraging high read and click-through rates.";
    offer = lowercaseGoal.includes("discount") || lowercaseGoal.includes("offer") || lowercaseGoal.includes("coupon") ? "10% off coupon" : "None";
    explainOffer = offer !== "None" ? "A standard 10% discount is offered to capture deal-seeking regular shoppers." : "No financial discount is needed.";
    timing = "Send during afternoon peak (1 PM - 3 PM)";
    explainTiming = "Sent during high-conversion windows matching peak customer activity.";
  } else if (lowercaseGoal.includes("discount") || lowercaseGoal.includes("offer") || lowercaseGoal.includes("coupon")) {
    offer = "10% off coupon";
    explainOffer = "A standard 10% discount is offered to capture deal-seeking regular shoppers.";
  }

  // Validate output using Zod schema to ensure shape safety
  return StrategyResponseSchema.parse({
    channel,
    offer,
    timing,
    explainChannel,
    explainOffer,
    explainTiming,
  });
}
