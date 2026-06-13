import { prisma } from "../lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GoalCategory =
  | "WIN_BACK"
  | "RETENTION"
  | "CROSS_SELL"
  | "VIP"
  | "UNCATEGORIZED";

export type IntelligenceMode = "benchmark" | "hybrid" | "adaptive";
export type ConfidenceLevel = "Benchmark" | "Low" | "Medium" | "High";

export interface ChannelPerformance {
  channel: string;
  campaigns: number;
  conversionRate: number;
  revenuePerRecipient: number;
}

export interface AdaptiveRecommendation {
  mode: IntelligenceMode;
  category: GoalCategory;
  confidence: ConfidenceLevel;
  sampleSize: number;
  similarityThreshold: number;
  bestChannel: string;
  channelPerformance: ChannelPerformance[];
  bestTiming: string | null;
  bestOffer: string | null;
  driftInsights: string[];
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal Categorization (deterministic keyword matching)
// ─────────────────────────────────────────────────────────────────────────────

const GOAL_KEYWORDS: Record<GoalCategory, string[]> = {
  WIN_BACK: ["win back", "winback", "dormant", "inactive", "recover", "re-engage", "reengage", "lapsed"],
  RETENTION: ["retain", "retention", "loyal", "repeat", "loyalty", "returning"],
  CROSS_SELL: ["cross sell", "cross-sell", "complementary", "upsell", "up-sell", "bundle"],
  VIP: ["vip", "premium", "high value", "high-value", "high spent", "top spender"],
  UNCATEGORIZED: [],
};

export function categorizeGoal(goal: string): GoalCategory {
  const lower = goal.toLowerCase();
  for (const [category, keywords] of Object.entries(GOAL_KEYWORDS)) {
    if (category === "UNCATEGORIZED") continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as GoalCategory;
      }
    }
  }
  return "UNCATEGORIZED";
}

// ─────────────────────────────────────────────────────────────────────────────
// Weighted Similarity Scoring
// Replaces simple "same category = similar" with a multi-signal score.
// Each signal adds points; only campaigns above SIMILARITY_THRESHOLD are used.
// ─────────────────────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 60;

// Common city names to detect location overlap between goals
const CITY_PATTERNS = [
  "mumbai", "delhi", "bangalore", "bengaluru", "pune", "hyderabad",
  "chennai", "kolkata", "ahmedabad", "jaipur", "lucknow", "surat",
  "chandigarh", "noida", "gurgaon", "gurugram", "kochi", "indore",
];

// Offer-type categories for matching similarity
const OFFER_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\d+%\s*(?:off|discount)/i, type: "percentage_discount" },
  { pattern: /free\s+shipping/i, type: "free_shipping" },
  { pattern: /free\s+\w+/i, type: "freebie" },
  { pattern: /buy\s+one|bogo/i, type: "bogo" },
  { pattern: /voucher|coupon/i, type: "voucher" },
];

function detectOfferType(text: string): string | null {
  for (const { pattern, type } of OFFER_TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return null;
}

function detectCities(text: string): string[] {
  const lower = text.toLowerCase();
  return CITY_PATTERNS.filter((city) => lower.includes(city));
}

function detectExplicitChannel(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("whatsapp") || lower.includes("whats app")) return "whatsapp";
  if (lower.includes("email")) return "email";
  if (lower.includes("sms")) return "sms";
  return null;
}

/**
 * Computes a weighted similarity score between the current goal and a historical campaign.
 * Scoring:
 *   +50 → same goal category
 *   +20 → both mention VIP/high-value customers
 *   +20 → same city/location detected in both goals
 *   +10 → same offer type (discount/free shipping/etc.)
 *   +10 → same channel explicitly mentioned
 */
export function computeSimilarityScore(
  currentGoal: string,
  historicalGoal: string,
  strategyReasoning?: string
): number {
  let score = 0;
  const currentLower = currentGoal.toLowerCase();
  const historicalLower = historicalGoal.toLowerCase();

  // +50: same goal category
  if (categorizeGoal(currentGoal) === categorizeGoal(historicalGoal)) {
    score += 50;
  }

  // +20: both mention VIP/high-value
  const vipKeywords = ["vip", "premium", "high value", "high-value", "high spent", "top spender"];
  const currentHasVip = vipKeywords.some((k) => currentLower.includes(k));
  const historicalHasVip = vipKeywords.some((k) => historicalLower.includes(k));
  if (currentHasVip && historicalHasVip) {
    score += 20;
  }

  // +20: same city/location
  const currentCities = detectCities(currentGoal);
  const historicalCities = detectCities(historicalGoal);
  if (currentCities.length > 0 && currentCities.some((c) => historicalCities.includes(c))) {
    score += 20;
  }

  // +10: same offer type (check goal text and strategy reasoning)
  const combinedHistorical = historicalLower + " " + (strategyReasoning || "").toLowerCase();
  const currentOfferType = detectOfferType(currentLower);
  const historicalOfferType = detectOfferType(combinedHistorical);
  if (currentOfferType && historicalOfferType && currentOfferType === historicalOfferType) {
    score += 10;
  }

  // +10: same channel explicitly mentioned
  const currentChannel = detectExplicitChannel(currentGoal);
  const historicalChannel = detectExplicitChannel(historicalGoal);
  if (currentChannel && historicalChannel && currentChannel === historicalChannel) {
    score += 10;
  }

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Extraction (safe parsing from JSON)
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedStats {
  sent: number;
  convertedOrders: number;
  conversionRevenue: number;
}

function extractStats(stats: unknown): ParsedStats | null {
  if (!stats || typeof stats !== "object") return null;
  const s = stats as Record<string, unknown>;

  const sent = typeof s.sent === "number" ? s.sent : 0;
  const convertedOrders = typeof s.convertedOrders === "number" ? s.convertedOrders : 0;
  const conversionRevenue = typeof s.conversionRevenue === "number" ? s.conversionRevenue : 0;

  // Skip campaigns with no sends — they have no meaningful signal
  if (sent === 0) return null;

  return { sent, convertedOrders, conversionRevenue };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Reasoning Extractor (extracts strategy step from agentThoughts)
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractedStrategy {
  reasoning: string;
  recommendedChannel: string | null;
  recommendedTiming: string | null;
  recommendedOffer: string | null;
}

function extractStrategyFromThoughts(agentThoughts: unknown): ExtractedStrategy | null {
  if (!Array.isArray(agentThoughts)) return null;

  for (const thought of agentThoughts) {
    if (
      thought &&
      typeof thought === "object" &&
      (thought as Record<string, unknown>).step === "strategy_recommendation"
    ) {
      const reasoning = String((thought as Record<string, unknown>).reasoning || "");
      // Extract what was recommended (not what happened)
      const channelMatch = reasoning.match(/recommended channel:\s*"?(\w+)"?/i);
      const recommendedChannel = channelMatch ? channelMatch[1].toLowerCase() : null;
      const recommendedTiming = extractTiming(reasoning);
      const recommendedOffer = extractOffer(reasoning);

      return { reasoning, recommendedChannel, recommendedTiming, recommendedOffer };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timing Intelligence (regex extraction from agentThoughts)
// ─────────────────────────────────────────────────────────────────────────────

const TIMING_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(morning|afternoon|evening|night)/i, label: "" }, // dynamic
  { pattern: /\b(weekend)\b/i, label: "Weekend" },
  { pattern: /\b(evening|night)\b/i, label: "Evening" },
  { pattern: /\b(morning)\b/i, label: "Morning" },
  { pattern: /\b(afternoon)\b/i, label: "Afternoon" },
  { pattern: /\bsend immediately\b/i, label: "Immediate" },
  { pattern: /\b(friday evening|friday night)\b/i, label: "Friday evening" },
  { pattern: /\b(\d{1,2}\s*(?:AM|PM)\s*-\s*\d{1,2}\s*(?:AM|PM))/i, label: "" }, // dynamic
];

export function extractTiming(reasoning: string): string | null {
  for (const { pattern, label } of TIMING_PATTERNS) {
    const match = reasoning.match(pattern);
    if (match) {
      // If label is empty, use the matched text directly (capitalized)
      if (label === "") {
        return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
      }
      return label;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offer Intelligence (regex extraction from agentThoughts)
// ─────────────────────────────────────────────────────────────────────────────

const OFFER_PATTERNS: RegExp[] = [
  /(\d{1,2}%\s*off\s*coupon)/i,
  /(\d{1,2}%\s*discount)/i,
  /(\d{1,2}%\s*off)/i,
  /(free\s+shipping)/i,
  /(free\s+\w+\s*voucher)/i,
  /(buy\s+one\s+get\s+one)/i,
  /(BOGO)/i,
];

export function extractOffer(reasoning: string): string | null {
  for (const pattern of OFFER_PATTERNS) {
    const match = reasoning.match(pattern);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Scoring
// ─────────────────────────────────────────────────────────────────────────────

export function computeConfidence(sampleSize: number): ConfidenceLevel {
  if (sampleSize === 0) return "Benchmark";
  if (sampleSize <= 2) return "Low";
  if (sampleSize <= 4) return "Medium";
  return "High";
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence Mode
// ─────────────────────────────────────────────────────────────────────────────

export function computeMode(sampleSize: number): IntelligenceMode {
  if (sampleSize === 0) return "benchmark";
  if (sampleSize <= 2) return "hybrid";
  return "adaptive";
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmark Defaults (industry best practices)
// ─────────────────────────────────────────────────────────────────────────────

const BENCHMARK_CHANNELS: Record<GoalCategory, string> = {
  WIN_BACK: "whatsapp",
  RETENTION: "email",
  VIP: "sms",
  CROSS_SELL: "whatsapp",
  UNCATEGORIZED: "email",
};

const BENCHMARK_TIMING: Record<GoalCategory, string> = {
  WIN_BACK: "Immediate",
  RETENTION: "Evening",
  VIP: "Friday evening",
  CROSS_SELL: "Afternoon",
  UNCATEGORIZED: "Afternoon",
};

const BENCHMARK_OFFERS: Record<GoalCategory, string> = {
  WIN_BACK: "15–20% discount",
  RETENTION: "Loyalty reward",
  VIP: "Exclusive voucher",
  CROSS_SELL: "Bundle offer",
  UNCATEGORIZED: "10% discount",
};

const MODE_MESSAGES: Record<IntelligenceMode, string> = {
  benchmark:
    "No historical campaigns found for this objective category. Using industry benchmarks until sufficient data is collected.",
  hybrid:
    "Limited campaign history detected. Combining observed outcomes with industry benchmarks for a blended recommendation.",
  adaptive:
    "Recommendations are derived from attributed outcomes of previous campaigns. The system is adapting to your business data.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Drift Detection
// Compares what the Strategy Agent recommended vs what actually produced
// results. Surfaces patterns where outcomes diverged from recommendations.
// ─────────────────────────────────────────────────────────────────────────────

interface DriftRecord {
  recommendedChannel: string | null;
  actualChannel: string;
  recommendedTiming: string | null;
  recommendedOffer: string | null;
  conversionRate: number;
  revenuePerRecipient: number;
}

function detectDriftInsights(driftRecords: DriftRecord[]): string[] {
  const insights: string[] = [];
  if (driftRecords.length < 2) return insights;

  // ── Channel drift: compare performance across channels ──
  const channelRates: Record<string, { totalRate: number; count: number }> = {};
  for (const r of driftRecords) {
    const ch = r.actualChannel;
    if (!channelRates[ch]) channelRates[ch] = { totalRate: 0, count: 0 };
    channelRates[ch].totalRate += r.conversionRate;
    channelRates[ch].count += 1;
  }

  const channelAvgs = Object.entries(channelRates)
    .map(([ch, { totalRate, count }]) => ({ ch, avg: count > 0 ? totalRate / count : 0 }))
    .sort((a, b) => b.avg - a.avg);

  // If the top-performing channel differs from what was most frequently recommended
  if (channelAvgs.length >= 2) {
    const topChannel = channelAvgs[0];
    const bottomChannel = channelAvgs[channelAvgs.length - 1];
    const uplift = topChannel.avg - bottomChannel.avg;
    if (uplift > 0.005) {
      // Threshold: 0.5% conversion rate difference to report
      insights.push(
        `Historical outcomes suggest ${topChannel.ch.toUpperCase()} outperformed ${bottomChannel.ch.toUpperCase()} by ${(uplift * 100).toFixed(1)}% conversion rate for similar campaigns.`
      );
    }
  }

  // ── Timing drift: compare timing cohorts ──
  const timingRates: Record<string, { totalRate: number; count: number }> = {};
  for (const r of driftRecords) {
    if (r.recommendedTiming) {
      if (!timingRates[r.recommendedTiming]) timingRates[r.recommendedTiming] = { totalRate: 0, count: 0 };
      timingRates[r.recommendedTiming].totalRate += r.conversionRate;
      timingRates[r.recommendedTiming].count += 1;
    }
  }

  const timingAvgs = Object.entries(timingRates)
    .map(([t, { totalRate, count }]) => ({ timing: t, avg: count > 0 ? totalRate / count : 0 }))
    .sort((a, b) => b.avg - a.avg);

  if (timingAvgs.length >= 2) {
    const best = timingAvgs[0];
    const worst = timingAvgs[timingAvgs.length - 1];
    if (best.avg > worst.avg && best.avg > 0) {
      const multiplier = worst.avg > 0 ? (best.avg / worst.avg).toFixed(1) : "significantly";
      insights.push(
        `${best.timing} campaigns converted ${multiplier}× better than ${worst.timing.toLowerCase()} sends.`
      );
    }
  }

  // ── Offer drift: compare offer cohorts ──
  const offerRates: Record<string, { totalRate: number; count: number }> = {};
  for (const r of driftRecords) {
    if (r.recommendedOffer) {
      if (!offerRates[r.recommendedOffer]) offerRates[r.recommendedOffer] = { totalRate: 0, count: 0 };
      offerRates[r.recommendedOffer].totalRate += r.conversionRate;
      offerRates[r.recommendedOffer].count += 1;
    }
  }

  const offerAvgs = Object.entries(offerRates)
    .map(([o, { totalRate, count }]) => ({ offer: o, avg: count > 0 ? totalRate / count : 0 }))
    .sort((a, b) => b.avg - a.avg);

  if (offerAvgs.length >= 2) {
    const best = offerAvgs[0];
    insights.push(
      `Campaigns with "${best.offer}" achieved the strongest ROI among tested incentive types.`
    );
  } else if (offerAvgs.length === 1 && offerAvgs[0].avg > 0) {
    insights.push(
      `"${offerAvgs[0].offer}" was the only incentive tested — consider A/B testing alternatives.`
    );
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Engine
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdaptiveRecommendations(
  goal: string
): Promise<AdaptiveRecommendation> {
  const category = categorizeGoal(goal);

  // ── 1. Fetch all completed campaigns with their segment goals ──
  const allCompleted = await prisma.campaign.findMany({
    where: { status: "completed" },
    select: {
      id: true,
      channel: true,
      stats: true,
      agentThoughts: true,
      segment: {
        select: {
          naturalLanguageQuery: true,
        },
      },
    },
  });

  // ── 2. Weighted similarity scoring ──
  // Replace simple category match with multi-signal scoring.
  // Each campaign gets a similarity score; only those above threshold are used.
  const similarCampaigns: Array<{
    campaign: typeof allCompleted[number];
    similarityScore: number;
    strategyExtract: ExtractedStrategy | null;
  }> = [];

  for (const c of allCompleted) {
    const segGoal = c.segment?.naturalLanguageQuery;
    if (!segGoal) continue;

    // Extract strategy reasoning for richer similarity scoring
    const strategyExtract = extractStrategyFromThoughts(c.agentThoughts);
    const score = computeSimilarityScore(
      goal,
      segGoal,
      strategyExtract?.reasoning
    );

    if (score >= SIMILARITY_THRESHOLD) {
      similarCampaigns.push({ campaign: c, similarityScore: score, strategyExtract });
    }
  }

  // Sort by similarity score descending for deterministic processing
  similarCampaigns.sort((a, b) => b.similarityScore - a.similarityScore);

  const sampleSize = similarCampaigns.length;
  const mode = computeMode(sampleSize);
  const confidence = computeConfidence(sampleSize);

  // ── 3. Cold start: return benchmark-only ──
  if (mode === "benchmark") {
    return {
      mode,
      category,
      confidence,
      sampleSize: 0,
      similarityThreshold: SIMILARITY_THRESHOLD,
      bestChannel: BENCHMARK_CHANNELS[category],
      channelPerformance: [],
      bestTiming: BENCHMARK_TIMING[category],
      bestOffer: BENCHMARK_OFFERS[category],
      driftInsights: [],
      message: MODE_MESSAGES[mode],
    };
  }

  // ── 4. Aggregate channel performance ──
  const channelAgg: Record<
    string,
    { campaigns: number; totalConversions: number; totalSent: number; totalRevenue: number }
  > = {};

  // Timing and offer tracking with associated conversion rates
  const timingPerf: Record<string, { totalRate: number; count: number }> = {};
  const offerPerf: Record<string, { totalRate: number; count: number }> = {};

  // Collect drift records for strategy drift detection
  const driftRecords: DriftRecord[] = [];

  for (const { campaign, strategyExtract } of similarCampaigns) {
    const stats = extractStats(campaign.stats);
    if (!stats) continue;

    const ch = campaign.channel.toLowerCase();
    if (!channelAgg[ch]) {
      channelAgg[ch] = { campaigns: 0, totalConversions: 0, totalSent: 0, totalRevenue: 0 };
    }
    channelAgg[ch].campaigns += 1;
    channelAgg[ch].totalConversions += stats.convertedOrders;
    channelAgg[ch].totalSent += stats.sent;
    channelAgg[ch].totalRevenue += stats.conversionRevenue;

    const conversionRate = stats.sent > 0 ? stats.convertedOrders / stats.sent : 0;
    const revenuePerRecipient = stats.sent > 0 ? stats.conversionRevenue / stats.sent : 0;

    // ── Extract timing & offer using the pre-extracted strategy ──
    if (strategyExtract) {
      const timing = strategyExtract.recommendedTiming || extractTiming(strategyExtract.reasoning);
      if (timing) {
        if (!timingPerf[timing]) timingPerf[timing] = { totalRate: 0, count: 0 };
        timingPerf[timing].totalRate += conversionRate;
        timingPerf[timing].count += 1;
      }

      const offer = strategyExtract.recommendedOffer || extractOffer(strategyExtract.reasoning);
      if (offer) {
        if (!offerPerf[offer]) offerPerf[offer] = { totalRate: 0, count: 0 };
        offerPerf[offer].totalRate += conversionRate;
        offerPerf[offer].count += 1;
      }

      // Build drift record for strategy drift detection
      driftRecords.push({
        recommendedChannel: strategyExtract.recommendedChannel,
        actualChannel: ch,
        recommendedTiming: timing,
        recommendedOffer: offer,
        conversionRate,
        revenuePerRecipient,
      });
    }
  }

  // ── 5. Build channel performance array sorted by conversion rate ──
  const channelPerformance: ChannelPerformance[] = Object.entries(channelAgg)
    .map(([channel, agg]) => ({
      channel,
      campaigns: agg.campaigns,
      conversionRate: agg.totalSent > 0 ? agg.totalConversions / agg.totalSent : 0,
      revenuePerRecipient: agg.totalSent > 0 ? agg.totalRevenue / agg.totalSent : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

  // ── 6. Determine best channel ──
  // Weighted hybrid mode: blend historical data with benchmark using confidence weight.
  // historicalWeight = min(sampleSize / 5, 1) → gradually transitions from benchmarks to data.
  const historicalWeight = Math.min(sampleSize / 5, 1);
  const benchmarkWeight = 1 - historicalWeight;

  const bestChannelFromData = channelPerformance.length > 0 ? channelPerformance[0].channel : null;
  const benchmarkChannel = BENCHMARK_CHANNELS[category];

  let bestChannel: string;
  if (mode === "hybrid" && bestChannelFromData) {
    // In hybrid mode with data: use weighted blending logic.
    // If historical data has a clear winner with meaningful volume, prefer it;
    // otherwise fall back to benchmark channel.
    const dataTopRate = channelPerformance[0]?.conversionRate || 0;
    const benchmarkEntry = channelPerformance.find((cp) => cp.channel === benchmarkChannel);
    const benchmarkRate = benchmarkEntry?.conversionRate || 0;

    // Weighted comparison: data channel must outperform benchmark by the historical weight
    // to override it. This means early on (1 campaign, weight=0.2), benchmark gets priority
    // unless data is dramatically better. With more data, data takes precedence.
    const weightedDataScore = dataTopRate * historicalWeight;
    const weightedBenchmarkScore = benchmarkRate * benchmarkWeight;

    if (weightedDataScore >= weightedBenchmarkScore || !benchmarkEntry) {
      bestChannel = bestChannelFromData;
    } else {
      bestChannel = benchmarkChannel;
    }
  } else {
    bestChannel = bestChannelFromData || benchmarkChannel;
  }

  // ── 7. Determine best timing ──
  let bestTiming: string | null = null;
  let bestTimingRate = -1;
  for (const [timing, perf] of Object.entries(timingPerf)) {
    const avgRate = perf.count > 0 ? perf.totalRate / perf.count : 0;
    if (avgRate > bestTimingRate) {
      bestTimingRate = avgRate;
      bestTiming = timing;
    }
  }
  // Fallback to benchmark for hybrid or if no timing extracted
  if (!bestTiming) {
    bestTiming = BENCHMARK_TIMING[category];
  }

  // ── 8. Determine best offer ──
  let bestOffer: string | null = null;
  let bestOfferRate = -1;
  for (const [offer, perf] of Object.entries(offerPerf)) {
    const avgRate = perf.count > 0 ? perf.totalRate / perf.count : 0;
    if (avgRate > bestOfferRate) {
      bestOfferRate = avgRate;
      bestOffer = offer;
    }
  }
  // Fallback to benchmark for hybrid or if no offer extracted
  if (!bestOffer) {
    bestOffer = BENCHMARK_OFFERS[category];
  }

  // ── 9. Strategy drift detection ──
  const driftInsights = detectDriftInsights(driftRecords);

  return {
    mode,
    category,
    confidence,
    sampleSize,
    similarityThreshold: SIMILARITY_THRESHOLD,
    bestChannel,
    channelPerformance,
    bestTiming,
    bestOffer,
    driftInsights,
    message: MODE_MESSAGES[mode],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Prompt Builder (formats insights for injection into Strategy Agent)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdaptivePromptSection(rec: AdaptiveRecommendation): string {
  const lines: string[] = [
    "",
    "═══════════════════════════════════════════════════",
    "ADAPTIVE RECOMMENDATION ENGINE — Historical Intelligence",
    "═══════════════════════════════════════════════════",
    "",
    `Category: ${rec.category}`,
    `Mode: ${rec.mode.toUpperCase()}`,
    `Confidence: ${rec.confidence}`,
    `Sample Size: ${rec.sampleSize} similar completed campaigns (similarity ≥ ${rec.similarityThreshold})`,
    "",
  ];

  if (rec.channelPerformance.length > 0) {
    lines.push("Historical Channel Outcomes:");
    for (const cp of rec.channelPerformance) {
      lines.push(
        `  • ${cp.channel.toUpperCase()}: ${(cp.conversionRate * 100).toFixed(1)}% conversion rate, ₹${cp.revenuePerRecipient.toFixed(0)}/recipient (${cp.campaigns} campaign${cp.campaigns !== 1 ? "s" : ""})`
      );
    }
    lines.push("");
  }

  lines.push(`Best Channel: ${rec.bestChannel.toUpperCase()}`);

  if (rec.bestTiming) {
    lines.push(`Best Timing: ${rec.bestTiming}`);
  }
  if (rec.bestOffer) {
    lines.push(`Best Offer: ${rec.bestOffer}`);
  }

  // ── Append strategy drift insights for the Strategy Agent to consider ──
  if (rec.driftInsights.length > 0) {
    lines.push("");
    lines.push("Strategy Drift Insights (what worked vs what was recommended):");
    for (const insight of rec.driftInsights) {
      lines.push(`  ⚠ ${insight}`);
    }
  }

  lines.push("");
  lines.push("INSTRUCTION: Use these insights heavily when generating strategy recommendations.");
  lines.push("If explicit user intent conflicts with recommendations, preserve user intent and explain why.");
  lines.push("");

  return lines.join("\n");
}
