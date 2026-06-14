export type RefinementIntent = "CHANNEL_CHANGE" | "OFFER_CHANGE" | "COPY_CHANGE" | "UNKNOWN";

export function classifyRefinementIntent(instruction: string): RefinementIntent {
  const text = instruction.toLowerCase();

  // 1. Channel
  const isChannelChange = 
    text.includes("email") || 
    text.includes("sms") || 
    text.includes("whatsapp") || 
    text.includes("channel");

  // 2. Offer
  const isOfferChange = 
    text.includes("offer") || 
    text.includes("discount") || 
    text.includes("%") || 
    text.includes("free shipping") || 
    text.includes("buy 1");

  // 3. Copy / Tone
  const isCopyChange = 
    text.includes("urgent") || 
    text.includes("emoji") || 
    text.includes("shorter") || 
    text.includes("shorten") || 
    text.includes("longer") ||
    text.includes("premium") || 
    text.includes("playful") || 
    text.includes("friendly") || 
    text.includes("exclusive") || 
    text.includes("sound") || 
    text.includes("remove") ||
    text.includes("tone") ||
    text.includes("make it");

  // Resolve overlaps deterministically based on strongest signal
  if (isChannelChange && !isOfferChange) {
    return "CHANNEL_CHANGE";
  }

  if (isOfferChange && !isChannelChange) {
    return "OFFER_CHANGE";
  }

  if (isCopyChange) {
    return "COPY_CHANGE";
  }

  // Fallbacks for specific phrasing
  if (text.match(/change.*to/)) {
    if (text.match(/email|sms|whatsapp/)) return "CHANNEL_CHANGE";
    if (text.match(/%|off/)) return "OFFER_CHANGE";
  }

  return "UNKNOWN";
}
