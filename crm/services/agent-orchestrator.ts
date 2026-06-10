import { prisma } from "../lib/prisma";
import { SegmentEngine } from "./segment-engine";
import { runSegmentationAgent } from "../ai/segmentation";
import { runStrategyAgent } from "../ai/strategy";
import { runContentAgent } from "../ai/content";
import { safeGenerate } from "../lib/gemini";

export interface CampaignWorkspacePayload {
  campaignId: string;
  goal: string;
  segmentId: string;
  segmentName: string;
  description: string;
  customerCount: number;
  aov: number;
  potentialRevenue: number;
  opportunityReasoning: string;
  explainAudience: string;
  channel: "email" | "sms";
  offer: string;
  timing: string;
  explainChannel: string;
  explainOffer: string;
  explainTiming: string;
  subject: string;
  body: string;
  explainContent: string;
}

export const AgentOrchestrator = {
  async generateCampaign(goal: string): Promise<CampaignWorkspacePayload> {
    console.log(`🤖 Starting Agent Orchestrator for goal: "${goal}"`);

    // 1. Run Segmentation Agent
    console.log("👥 Running Segmentation Agent...");
    const segmentation = await runSegmentationAgent(goal);

    // Safety check: detect if AI returned fallback/empty rules (targets ALL customers)
    const isAIFallback = !segmentation.rules?.and?.length;
    if (isAIFallback) {
      console.warn("⚠️ Segmentation Agent returned empty rules (fallback). Campaign will target all customers.");
    }

    // 2. Database-First Opportunity Sizing
    console.log("📊 Sizing segment against live database...");
    const whereClause = SegmentEngine.buildWhereClause(segmentation.rules);
    const matchingCustomers = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        totalSpent: true,
        totalOrders: true,
      },
    });

    const customerCount = matchingCustomers.length;

    // Calculate Average Order Value (AOV) for this matching set
    let totalSpentSum = 0;
    let totalOrdersSum = 0;
    for (const c of matchingCustomers) {
      totalSpentSum += c.totalSpent;
      totalOrdersSum += c.totalOrders;
    }

    let calculatedAov = 0;
    if (totalOrdersSum > 0) {
      calculatedAov = totalSpentSum / totalOrdersSum;
    } else {
      // Fallback to store-wide AOV
      const allOrdersAvg = await prisma.order.aggregate({
        _avg: { totalAmount: true },
      });
      calculatedAov = allOrdersAvg._avg.totalAmount || 1500; // default to 1500 if DB is empty
    }

    const potentialRevenue = customerCount * calculatedAov;

    // Opportunity Agent Reasoning (AI explanation of the calculated opportunity)
    console.log("💰 Running Opportunity Agent for reasoning...");
    let opportunityReasoning = "";
    try {
      const opportunityPrompt = `
You are the Opportunity Agent for Brew CampaignOS.
Explain why this audience segment represents a marketing opportunity of ₹${potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} across ${customerCount} customers with an Average Order Value of ₹${calculatedAov.toFixed(0)}.
Keep it to 2-3 sentences max. Focus on business potential (e.g., subscription retention, cash flow, or customer lifetime value).
Marketing Goal: "${goal}"
`;
      const oppText = await safeGenerate(opportunityPrompt);
      opportunityReasoning = oppText;
    } catch (e) {
      console.error("Error running Opportunity Agent:", e);
      opportunityReasoning = `Found ${customerCount} matching customers with an AOV of ₹${calculatedAov.toFixed(0)}, representing a recovery opportunity of ₹${potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.`;
    }

    // 3. Run Strategy Agent
    console.log("🎯 Running Strategy Agent...");
    const strategy = await runStrategyAgent(
      goal,
      segmentation.segmentName,
      segmentation.description,
      customerCount,
      potentialRevenue,
      calculatedAov
    );

    // 4. Run Content Agent
    console.log("✍️ Running Content Agent...");
    const content = await runContentAgent(
      goal,
      segmentation.segmentName,
      strategy.channel,
      strategy.offer
    );

    // 5. Save Segment & Campaign as drafts in DB
    console.log("💾 Saving generated Segment & Campaign in DB...");
    const segment = await prisma.segment.create({
      data: {
        name: segmentation.segmentName,
        description: segmentation.description,
        rules: segmentation.rules as any,
        naturalLanguageQuery: goal,
        customerCount: customerCount,
        createdBy: "AI Autopilot",
      },
    });

    const campaignStats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      convertedOrders: 0,
      failed: 0,
      conversionRevenue: 0,
      ...(isAIFallback && {
        isFallback: true,
        fallbackWarning: "AI segmentation failed — targeting all customers. Review the audience before launching.",
      }),
      explainAudience: segmentation.explainAudience,
      opportunityReasoning,
      potentialRevenue,
      aov: calculatedAov,
      explainChannel: strategy.explainChannel,
      explainOffer: strategy.explainOffer,
      explainTiming: strategy.explainTiming,
      explainContent: content.explainContent,
      subject: content.subject,
      offer: strategy.offer,
      timing: strategy.timing,
      goal,
    };

    const campaign = await prisma.campaign.create({
      data: {
        name: `Autopilot: ${segmentation.segmentName}`,
        segmentId: segment.id,
        channel: strategy.channel,
        messageTemplate: content.body,
        status: "draft",
        totalRecipients: customerCount,
        stats: campaignStats as any,
        createdBy: "AI Autopilot",
      },
    });

    console.log("✅ Campaign generated and saved successfully!");

    return {
      campaignId: campaign.id,
      goal,
      segmentId: segment.id,
      segmentName: segmentation.segmentName,
      description: segmentation.description,
      customerCount,
      aov: calculatedAov,
      potentialRevenue,
      opportunityReasoning,
      explainAudience: segmentation.explainAudience,
      channel: strategy.channel,
      offer: strategy.offer,
      timing: strategy.timing,
      explainChannel: strategy.explainChannel,
      explainOffer: strategy.explainOffer,
      explainTiming: strategy.explainTiming,
      subject: content.subject,
      body: content.body,
      explainContent: content.explainContent,
    };
  },
};
