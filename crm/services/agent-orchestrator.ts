import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { SegmentEngine } from "./segment-engine";
import { runSegmentationAgent } from "../ai/segmentation";
import { runStrategyAgent } from "../ai/strategy";
import { runContentAgent } from "../ai/content";
import { safeGenerate } from "../lib/gemini";
import { AgentThought, SegmentRule } from "../types";
import { cleanJsonString, SegmentationResponseSchema } from "../ai/schemas";

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
  agentThoughts?: AgentThought[];
  status?: string;
}

export const AgentOrchestrator = {
  async generateCampaign(goal: string): Promise<CampaignWorkspacePayload> {
    console.log(`🤖 Starting Agent Orchestrator for goal: "${goal}"`);

    const agentThoughts: AgentThought[] = [];

    // 1. Run Segmentation Agent
    console.log("👥 Running Segmentation Agent...");
    let segmentation = await runSegmentationAgent(goal);

    agentThoughts.push({
      step: "segmentation_generation",
      agent: "Segmentation Agent",
      reasoning: `Translated goal "${goal}" into database rules for segment "${segmentation.segmentName}". Explanation: ${segmentation.explainAudience}`,
      timestamp: new Date().toISOString(),
    });

    // 2. Database-First Opportunity Sizing (with Self-Correction loop)
    let customerCount = 0;
    let matchingCustomers: { id: string; totalSpent: number; totalOrders: number }[] = [];
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      console.log(`📊 Sizing segment against live database (Attempt ${retryCount + 1})...`);
      const whereClause = SegmentEngine.buildWhereClause(segmentation.rules);
      matchingCustomers = await prisma.customer.findMany({
        where: whereClause,
        select: {
          id: true,
          totalSpent: true,
          totalOrders: true,
        },
      });

      customerCount = matchingCustomers.length;

      if (customerCount > 0) {
        console.log(`✅ Found ${customerCount} matching customers.`);
        break; // Found matching customers, exit sizing loop
      }

      // If customer count is 0 and we have retries left, relax constraints
      if (retryCount < maxRetries) {
        retryCount++;
        console.warn(`⚠️ Target customer count is 0. Running self-correction loop retry #${retryCount}...`);

        // Get database ranges using Prisma aggregate
        const stats = await prisma.customer.aggregate({
          _min: { totalSpent: true, totalOrders: true, lastOrderAt: true },
          _max: { totalSpent: true, totalOrders: true, lastOrderAt: true },
        });

        // Compute dormancy ranges (in days) using current time and lastOrderAt
        const now = new Date();
        const minDormancyDays = stats._max.lastOrderAt
          ? Math.max(0, Math.floor((now.getTime() - stats._max.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        const maxDormancyDays = stats._min.lastOrderAt
          ? Math.max(0, Math.floor((now.getTime() - stats._min.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)))
          : 365;

        // Build database ranges summary
        const rangeSummary = `
- Lifetime Spend: ₹${stats._min.totalSpent || 0} to ₹${stats._max.totalSpent || 0}
- Order Counts: ${stats._min.totalOrders || 0} to ${stats._max.totalOrders || 0}
- Recency / Dormancy: ${minDormancyDays} to ${maxDormancyDays} days since last purchase`;

        const correctionPrompt = `
You are the Segmentation Agent for Brew CampaignOS.
Your previous segment rules matched 0 customers. 

Previous Segment Name: "${segmentation.segmentName}"
Previous Rules JSON: ${JSON.stringify(segmentation.rules)}

Please relax the most restrictive filter by 30-50% to target a valid, larger audience for the goal: "${goal}".
Here are the actual database ranges for ALL customers currently in the system:
${rangeSummary}

Output a valid JSON object matching the format:
{
  "segmentName": "A revised, catchy name",
  "description": "Short explanation of the relaxed rules",
  "rules": {
    "and": [
      { "field": "field_name", "op": "operator_name", "value": value }
    ]
  },
  "explainAudience": "Explanation of how you relaxed the most restrictive filters (by 30-50%) and what ranges were modified."
}

Return ONLY the raw JSON string. Do not include markdown code block formatting (like \`\`\`json).
`;

        try {
          const text = await safeGenerate(correctionPrompt);
          const cleanJson = cleanJsonString(text);
          const parsed = JSON.parse(cleanJson);
          segmentation = SegmentationResponseSchema.parse(parsed);

          agentThoughts.push({
            step: `self_correction_retry_${retryCount}`,
            agent: "Self-Correction Loop",
            reasoning: `Segment query matched 0 customers. Queried database aggregates and adjusted filters. New rules: ${segmentation.description}. Explanation: ${segmentation.explainAudience}`,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error in self-correction loop retry #${retryCount}:`, error);
          // break loop on error to prevent infinite spin, fallback handles it
          break;
        }
      } else {
        // Exhausted case: 2 retries complete and count is still 0
        retryCount++; // exceeds maxRetries to stop the loop
      }
    }

    const isExhaustedFailure = customerCount === 0;

    // Calculate Average Order Value (AOV) for this matching set
    let calculatedAov = 0;
    let potentialRevenue = 0;
    let opportunityReasoning = "";

    if (!isExhaustedFailure) {
      let totalSpentSum = 0;
      let totalOrdersSum = 0;
      for (const c of matchingCustomers) {
        totalSpentSum += c.totalSpent;
        totalOrdersSum += c.totalOrders;
      }

      if (totalOrdersSum > 0) {
        calculatedAov = totalSpentSum / totalOrdersSum;
      } else {
        // Fallback to store-wide AOV
        const allOrdersAvg = await prisma.order.aggregate({
          _avg: { totalAmount: true },
        });
        calculatedAov = allOrdersAvg._avg.totalAmount || 1500;
      }

      potentialRevenue = customerCount * calculatedAov;

      // Opportunity Agent Reasoning (AI explanation of the calculated opportunity)
      console.log("💰 Generating opportunity explanation programmatically...");
      opportunityReasoning = `Found ${customerCount} matching customers with an Average Order Value of ₹${calculatedAov.toFixed(0)}, representing a recovery opportunity of ₹${potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.`;

      agentThoughts.push({
        step: "opportunity_sizing",
        agent: "Opportunity Agent",
        reasoning: `Sized target segment: ${customerCount} matching customers with AOV of ₹${calculatedAov.toFixed(0)}, representing ₹${potentialRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} potential. Reasoning: ${opportunityReasoning}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      opportunityReasoning = "Sizing failed to find matching customers even after multiple relaxation attempts. Sizing stopped.";
      agentThoughts.push({
        step: "exhausted_relaxation_failure",
        agent: "Orchestrator System",
        reasoning: `Failed to resolve any target customer records in the database even after multiple self-correction relaxation attempts. Sizing stopped and campaign marked as failed.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Safety check: detect if AI returned fallback/empty rules (targets ALL customers)
    const isAIFallback = !segmentation.rules?.and?.length;

    // 3. Run Strategy Agent
    console.log("🎯 Running Strategy Agent...");
    let strategy = {
      channel: "email" as "email" | "sms",
      offer: "None",
      timing: "Immediately",
      explainChannel: "No channel chosen due to sizing failure.",
      explainOffer: "No discount offered.",
      explainTiming: "Send immediately.",
    };

    if (!isExhaustedFailure) {
      try {
        const strategyRes = await runStrategyAgent(
          goal,
          segmentation.segmentName,
          segmentation.description,
          customerCount,
          potentialRevenue,
          calculatedAov
        );
        strategy = strategyRes;
      } catch (err) {
        console.error("Error in Strategy Agent:", err);
      }

      agentThoughts.push({
        step: "strategy_recommendation",
        agent: "Strategy Agent",
        reasoning: `Recommended channel: "${strategy.channel}" (${strategy.explainChannel}). Offer: "${strategy.offer}" (${strategy.explainOffer}). Timing: "${strategy.timing}" (${strategy.explainTiming}).`,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Run Content Agent
    console.log("✍️ Running Content Agent...");
    let content = {
      subject: "",
      body: "Hey [Name], we hope you are doing well! Check out our latest selection at Brew & Co.",
      explainContent: "No custom copy chosen.",
    };

    if (!isExhaustedFailure) {
      try {
        // Find if there is a daysSinceLastOrder rule in the segment to pass as dormancyDays
        const dormancyRule = segmentation.rules?.and?.find(
          (r: SegmentRule) => r.field === "daysSinceLastOrder"
        );
        const dormancyDays = dormancyRule ? Number(dormancyRule.value) : undefined;

        const contentRes = await runContentAgent(
          goal,
          segmentation.segmentName,
          strategy.channel,
          strategy.offer,
          {
            customerCount,
            aov: calculatedAov,
            potentialRevenue,
            dormancyDays,
          }
        );
        content = contentRes;
      } catch (err) {
        console.error("Error in Content Agent:", err);
      }

      agentThoughts.push({
        step: "content_generation",
        agent: "Content Agent",
        reasoning: `Generated copywriting template. Subject: "${content.subject || 'N/A'}". Rationale: ${content.explainContent}`,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Save Segment & Campaign as drafts/failed in DB
    console.log("💾 Saving generated Segment & Campaign in DB...");
    const segment = await prisma.segment.create({
      data: {
        name: segmentation.segmentName,
        description: segmentation.description,
        rules: segmentation.rules as unknown as Prisma.InputJsonValue,
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

    const campaignStatus = isExhaustedFailure ? "failed" : "draft";

    const campaign = await prisma.campaign.create({
      data: {
        name: `Autopilot: ${segmentation.segmentName}`,
        segmentId: segment.id,
        channel: strategy.channel,
        messageTemplate: content.body,
        status: campaignStatus,
        totalRecipients: customerCount,
        stats: campaignStats as unknown as Prisma.InputJsonValue,
        agentThoughts: agentThoughts as unknown as Prisma.InputJsonValue,
        createdBy: "AI Autopilot",
      },
    });

    console.log(`✅ Campaign generated and saved with status "${campaignStatus}"!`);

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
      agentThoughts,
      status: campaignStatus,
    };
  },
};
