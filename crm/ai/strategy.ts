import { StrategyResponseSchema, type StrategyAgentResponse } from "./schemas";

export type { StrategyAgentResponse };

export async function runStrategyAgent(
  goal: string,
  segmentName: string,
  segmentDescription: string,
  customerCount: number,
  potentialRevenue: number,
  aov: number,
  adaptiveContext?: string
): Promise<StrategyAgentResponse> {
  console.log(`🎯 Running deterministic Strategy Engine for segment: "${segmentName}"`);

  const lowercaseGoal = goal.toLowerCase();
  const lowercaseDesc = segmentDescription.toLowerCase();

  // 1. Parse dormancy days from description or goal
  const daysMatch = lowercaseDesc.match(/(\d+)\s*days?/i) || lowercaseGoal.match(/(\d+)\s*days?/i);
  const dormancyDays = daysMatch ? parseInt(daysMatch[1], 10) : 0;

  const isDormant = dormancyDays > 0 || lowercaseGoal.includes("inactive") || lowercaseGoal.includes("dormant");
  const isVIP = lowercaseGoal.includes("vip") || lowercaseGoal.includes("high spent") || lowercaseGoal.includes("high-value") || aov >= 3000 || lowercaseGoal.includes("reward");

  // 1.5. Parse adaptive insights to influence decisions
  let adaptiveBestChannel: string | null = null;
  let adaptiveBestTiming: string | null = null;
  let adaptiveBestOffer: string | null = null;
  let adaptiveMode: string | null = null;

  if (adaptiveContext) {
    console.log(`📊 Adaptive context injected into Strategy Agent`);
    const channelMatch = adaptiveContext.match(/Best Channel:\s*(\w+)/i);
    const timingMatch = adaptiveContext.match(/Best Timing:\s*(.+)/i);
    const offerMatch = adaptiveContext.match(/Best Offer:\s*(.+)/i);
    const modeMatch = adaptiveContext.match(/Mode:\s*(\w+)/i);

    if (channelMatch) adaptiveBestChannel = channelMatch[1].toLowerCase();
    if (timingMatch) adaptiveBestTiming = timingMatch[1].trim();
    if (offerMatch) adaptiveBestOffer = offerMatch[1].trim();
    if (modeMatch) adaptiveMode = modeMatch[1].toLowerCase();
  }

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

  // 2. Apply Adaptive Overrides — when adaptive/hybrid mode provides strong evidence,
  //    override the deterministic defaults while respecting explicit user intent in the goal.
  if (adaptiveMode === "adaptive" || adaptiveMode === "hybrid") {
    // Channel override: only if user didn't explicitly specify a channel in their goal
    const userRequestedChannel =
      lowercaseGoal.includes("whatsapp") ||
      lowercaseGoal.includes("email") ||
      lowercaseGoal.includes("sms");

    if (!userRequestedChannel && adaptiveBestChannel) {
      const validChannels = ["email", "sms", "whatsapp"] as const;
      const adaptiveChannel = validChannels.find((c) => c === adaptiveBestChannel);
      if (adaptiveChannel && adaptiveChannel !== channel) {
        const previousChannel = channel;
        channel = adaptiveChannel;
        explainChannel = `${channel.toUpperCase()} is selected based on historical campaign performance (adaptive override from ${previousChannel.toUpperCase()}). ${explainChannel}`;
      }
    }

    // Timing override: use adaptive timing if available
    if (adaptiveBestTiming) {
      timing = adaptiveBestTiming;
      explainTiming = `Timing set to "${adaptiveBestTiming}" based on historical campaign conversion data. ${explainTiming}`;
    }

    // Offer override: use adaptive offer if the current offer is generic
    if (adaptiveBestOffer && (offer === "None" || offer === "10% off coupon")) {
      offer = adaptiveBestOffer;
      explainOffer = `Offer "${adaptiveBestOffer}" recommended by adaptive engine based on historical conversion performance. ${explainOffer}`;
    }
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

