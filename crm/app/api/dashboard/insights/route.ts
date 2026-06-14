import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAIService } from "@/lib/ai";

interface OpportunityInput {
  type: string;
  affectedCustomers: number;
  estimatedRevenue: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  suggestedGoal: string;
  historicalSpend: number;
}

const FALLBACK_OPPORTUNITIES: Record<string, { title: string; whyItMatters: string; recommendedAction: string; suggestedGoal: string }> = {
  DORMANT_VIP: {
    title: "Dormant VIP Recovery",
    whyItMatters: "High-value customers who spent in the top 20% have not placed an order in over 60 days, representing immediate revenue leakage.",
    recommendedAction: "Launch a WhatsApp campaign with a 20% coupon code to reactivate their interest.",
    suggestedGoal: "Win back dormant VIP customers with a 20% discount on WhatsApp"
  },
  CROSS_SELL: {
    title: "Brewing Equipment Cross-Sell",
    whyItMatters: "Loyal coffee bean buyers who make frequent purchases have never bought any brewing gear or equipment.",
    recommendedAction: "Send an Email newsletter showcasing our premium coffee brewing equipment.",
    suggestedGoal: "Cross-sell brewing equipment to loyal coffee buyers"
  },
  CHANNEL_OPT: {
    title: "Channel Optimization Win-Back",
    whyItMatters: "Inactive customers respond better to instant channels. WhatsApp conversion outperforms email for this cohort.",
    recommendedAction: "Recover these customers using the highest-performing channel (WhatsApp).",
    suggestedGoal: "Recover inactive customers using the highest-performing channel"
  }
};

export async function GET() {
  try {
    const [
      totalCustomers,
      totalOrdersAgg,
    ] = await Promise.all([
      // Total Customers
      prisma.customer.count(),
      // Total Orders & Revenue
      prisma.order.aggregate({
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalOrders = totalOrdersAgg._count.id || 0;
    const totalRevenue = Math.round((totalOrdersAgg._sum.totalAmount || 0) * 100) / 100;

    // ── Deterministic Discovery Engine ──
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // 1. Dormant VIP Recovery calculations
    const limit = Math.ceil(totalCustomers * 0.20) || 1;
    const cutoffCustomer = await prisma.customer.findFirst({
      orderBy: { totalSpent: "desc" },
      skip: limit - 1,
      select: { totalSpent: true },
    });
    const spentThreshold = cutoffCustomer?.totalSpent || 0;

    const dormantVips = await prisma.customer.findMany({
      where: {
        totalSpent: { gte: spentThreshold },
        lastOrderAt: { lt: sixtyDaysAgo },
      },
      select: {
        id: true,
        totalSpent: true,
        totalOrders: true,
      },
    });

    const affectedCustomers1 = dormantVips.length;
    let cohortAOV = 0;
    let totalSpentSum1 = 0;
    if (affectedCustomers1 > 0) {
      totalSpentSum1 = dormantVips.reduce((sum: number, c: typeof dormantVips[number]) => sum + c.totalSpent, 0);
      const totalOrdersSum = dormantVips.reduce((sum: number, c: typeof dormantVips[number]) => sum + c.totalOrders, 0);
      cohortAOV = totalOrdersSum > 0 ? totalSpentSum1 / totalOrdersSum : 0;
    }
    const estimatedRevenue1 = Math.round(affectedCustomers1 * cohortAOV * 0.15);
    const confidence1 = affectedCustomers1 >= 15 ? "HIGH" : affectedCustomers1 >= 5 ? "MEDIUM" : "LOW";
    const historicalSpend1 = Math.round(totalSpentSum1);

    // 2. Brewing Equipment Cross-Sell calculations
    const loyalCustomers = await prisma.customer.findMany({
      where: {
        totalOrders: { gte: 3 },
      },
      include: {
        orders: {
          select: {
            items: true,
          },
        },
      },
    });

    const crossSellTargets: typeof loyalCustomers = [];
    for (const customer of loyalCustomers) {
      let boughtBeans = false;
      let boughtEquipment = false;
      for (const order of customer.orders) {
        const items = (order.items as Array<{ category?: string }>) || [];
        for (const item of items) {
          if (item.category === "beans") {
            boughtBeans = true;
          }
          if (item.category === "equipment") {
            boughtEquipment = true;
          }
        }
      }
      if (boughtBeans && !boughtEquipment) {
        crossSellTargets.push(customer);
      }
    }
    const affectedCustomers2 = crossSellTargets.length;
    const estimatedRevenue2 = Math.round(affectedCustomers2 * 1200 * 0.10);
    const confidence2 = affectedCustomers2 >= 20 ? "HIGH" : affectedCustomers2 >= 5 ? "MEDIUM" : "LOW";
    const historicalSpend2 = Math.round(crossSellTargets.reduce((sum: number, c: typeof crossSellTargets[number]) => sum + c.totalSpent, 0));

    // 3. Channel Optimization calculations
    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        lastOrderAt: { lt: sixtyDaysAgo },
      },
      select: {
        id: true,
        totalSpent: true,
      },
    });
    const affectedCustomers3 = inactiveCustomers.length;
    const historicalSpend3 = Math.round(inactiveCustomers.reduce((sum: number, c: typeof inactiveCustomers[number]) => sum + c.totalSpent, 0));

    // Determine recommended channel from campaign stats
    const launchedCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ["sent", "completed"] },
      },
      select: {
        channel: true,
        stats: true,
      },
    });

    const channelConvRateSum: Record<string, number> = {};
    const channelConvRateCount: Record<string, number> = {};

    for (const c of launchedCampaigns) {
      const stats = (c.stats as Record<string, number>) || {};
      const sent = stats.sent || 0;
      const converted = stats.convertedOrders || 0;
      if (sent > 0) {
        const rate = converted / sent;
        channelConvRateSum[c.channel] = (channelConvRateSum[c.channel] || 0) + rate;
        channelConvRateCount[c.channel] = (channelConvRateCount[c.channel] || 0) + 1;
      }
    }

    let recommendedChannel = "email";
    let bestRate = 0;
    for (const ch of ["email", "sms", "whatsapp"]) {
      const count = channelConvRateCount[ch] || 0;
      if (count > 0) {
        const avgRate = channelConvRateSum[ch] / count;
        if (avgRate > bestRate) {
          bestRate = avgRate;
          recommendedChannel = ch;
        }
      }
    }

    const storeAOV = totalOrders > 0 ? totalRevenue / totalOrders : 1500;
    const estimatedRevenue3 = Math.round(affectedCustomers3 * storeAOV * 0.05);
    const confidence3 = affectedCustomers3 >= 30 ? "HIGH" : affectedCustomers3 >= 10 ? "MEDIUM" : "LOW";

    // ── Build inputs for Gemini ──
    const opportunityInputs: OpportunityInput[] = [
      {
        type: "DORMANT_VIP",
        affectedCustomers: affectedCustomers1,
        estimatedRevenue: estimatedRevenue1,
        confidence: confidence1,
        suggestedGoal: "Re-engage dormant VIP customers with personalized offers.",
        historicalSpend: historicalSpend1,
      },
      {
        type: "CROSS_SELL",
        affectedCustomers: affectedCustomers2,
        estimatedRevenue: estimatedRevenue2,
        confidence: confidence2,
        suggestedGoal: "Cross-sell brewing equipment to loyal coffee buyers.",
        historicalSpend: historicalSpend2,
      },
      {
        type: "CHANNEL_OPT",
        affectedCustomers: affectedCustomers3,
        estimatedRevenue: estimatedRevenue3,
        confidence: confidence3,
        suggestedGoal: `Recover inactive customers using the highest-performing channel (${recommendedChannel.toUpperCase()}).`,
        historicalSpend: historicalSpend3,
      },
    ];

    // ── AI Call with Fallback ──
    let explanations: Array<{ type: string; title: string; whyItMatters: string; recommendedAction: string; suggestedGoal: string }> = [];
    try {
      const prompt = `You are a marketing strategist.
Below is a list of deterministic customer opportunities discovered in our database:

${JSON.stringify(opportunityInputs, null, 2)}

For each opportunity in the input list, write:
1. "title": A short, marketing-focused, catchy title.
2. "whyItMatters": A 1-2 sentence explanation of why this opportunity represents high value or customer leakage.
3. "recommendedAction": A 1-sentence recommendation on how the marketer should act (e.g. offering a specific discount or channel choice).
4. "suggestedGoal": A clear, marketer-friendly campaign goal that can be used directly as a prompt for our campaign generator. Keep it action-oriented (e.g. "Win back dormant VIP customers in Mumbai with a 20% WhatsApp offer").

Rules:
- Keep the explanations focused entirely on B2C consumer behavior.
- Do NOT change the opportunity "type" (must match the input "type" exactly).
- Do NOT include any formatting like markdown fences (e.g., \`\`\`json) or text other than the raw JSON object.
- Output exactly a JSON object with this schema:
{
  "opportunities": [
    {
      "type": "DORMANT_VIP | CROSS_SELL | CHANNEL_OPT",
      "title": "...",
      "whyItMatters": "...",
      "recommendedAction": "...",
      "suggestedGoal": "..."
    }
  ]
}
`;
      const { text } = await getAIService().callModel({
        task: "opportunity_explanations",
        userPrompt: prompt,
        temperature: 0.7,
        timeoutMs: 8000,
      });

      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.opportunities || !Array.isArray(parsed.opportunities)) {
        throw new Error("AI response missing opportunities array");
      }

      explanations = parsed.opportunities;
    } catch (e) {
      console.warn("Failed to generate opportunity explanations using AI. Using fallbacks.", e);
      explanations = opportunityInputs.map((input: OpportunityInput) => {
        const fb = FALLBACK_OPPORTUNITIES[input.type];
        return {
          type: input.type,
          title: fb.title,
          whyItMatters: fb.whyItMatters,
          recommendedAction: fb.recommendedAction,
          suggestedGoal: fb.suggestedGoal,
        };
      });
    }

    // Merge stats and explanations
    const opportunities = opportunityInputs.map((input) => {
      const expl = explanations.find((e: { type: string }) => e.type === input.type) || FALLBACK_OPPORTUNITIES[input.type];
      return {
        type: input.type,
        title: expl.title || FALLBACK_OPPORTUNITIES[input.type].title,
        whyItMatters: expl.whyItMatters || FALLBACK_OPPORTUNITIES[input.type].whyItMatters,
        recommendedAction: expl.recommendedAction || FALLBACK_OPPORTUNITIES[input.type].recommendedAction,
        suggestedGoal: expl.suggestedGoal || FALLBACK_OPPORTUNITIES[input.type].suggestedGoal,
        affectedCustomers: input.affectedCustomers,
        estimatedRevenue: input.estimatedRevenue,
        confidence: input.confidence,
        historicalSpend: input.historicalSpend,
      };
    });

    return NextResponse.json({
      opportunities,
    });
  } catch (error: unknown) {
    console.error("GET /api/dashboard/insights error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
