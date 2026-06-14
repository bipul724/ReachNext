import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyRefinementIntent } from "@/ai/refinement-classifier";
import { refineCopyHybrid } from "@/ai/copy-refiner";
import { runContentAgent } from "@/ai/content";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { instruction } = payload || {};

    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "draft") {
      return NextResponse.json({ error: "Only draft campaigns can be refined" }, { status: 400 });
    }

    const intent = classifyRefinementIntent(instruction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: Record<string, any> = (campaign.stats as Record<string, any>) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let agentThoughts: any[] = (campaign.agentThoughts as any[]) || [];
    let usedLLM = false;
    let assistantMessage = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changes: Record<string, any> = {};

    let updatedChannel = campaign.channel as "email" | "sms" | "whatsapp";
    let updatedOffer = stats.offer || "None";
    let updatedSubject = stats.subject || "";
    let updatedBody = campaign.messageTemplate;
    let explainChannel = stats.explainChannel || "";
    let explainOffer = stats.explainOffer || "";
    let explainContent = stats.explainContent || "";

    if (intent === "UNKNOWN") {
      return NextResponse.json({
        assistantMessage: "I can currently help modify channels, offers, and campaign copy.",
        usedLLM: false,
        workspace: buildWorkspacePayload(campaign, stats, agentThoughts)
      });
    }

    if (intent === "CHANNEL_CHANGE") {
      const lower = instruction.toLowerCase();
      const newChannel = lower.includes("email") ? "email" : lower.includes("sms") ? "sms" : "whatsapp";
      
      if (!["email", "sms", "whatsapp"].includes(newChannel)) {
         return NextResponse.json({
           assistantMessage: "I couldn't safely apply that refinement. Invalid channel.",
           usedLLM: false,
           workspace: buildWorkspacePayload(campaign, stats, agentThoughts)
         });
      }

      changes.channel = { before: updatedChannel, after: newChannel };
      updatedChannel = newChannel as "email" | "sms" | "whatsapp";
      explainChannel = `Changed to ${newChannel} as requested by user.`;
      
      const contentRes = await runContentAgent(stats.goal || "", campaign.segment.name, updatedChannel, updatedOffer, {
        customerCount: campaign.totalRecipients,
        aov: stats.aov || 0,
        potentialRevenue: stats.potentialRevenue || 0
      });

      updatedSubject = contentRes.subject;
      updatedBody = contentRes.body;
      explainContent = contentRes.explainContent;
      
      agentThoughts.push({
        step: "campaign_refinement",
        agent: "Campaign Copilot",
        reasoning: `User changed channel from ${changes.channel.before} to ${changes.channel.after}.`,
        timestamp: new Date().toISOString()
      });
      assistantMessage = `I've updated the campaign to ${newChannel} and adapted the copy.`;
    }
    else if (intent === "OFFER_CHANGE") {
      const offerMatch = instruction.match(/\d+%/);
      let newOffer = "Special Offer";
      if (offerMatch) {
        newOffer = `${offerMatch[0]} off`;
      } else if (instruction.toLowerCase().includes("free shipping")) {
        newOffer = "Free shipping";
      } else if (instruction.toLowerCase().includes("buy 1")) {
        newOffer = "Buy 1 Get 1";
      }
      
      if (!newOffer || newOffer.trim().length === 0) {
         return NextResponse.json({
           assistantMessage: "I couldn't safely apply that refinement. Offer cannot be empty.",
           usedLLM: false,
           workspace: buildWorkspacePayload(campaign, stats, agentThoughts)
         });
      }

      changes.offer = { before: updatedOffer, after: newOffer };
      updatedOffer = newOffer;
      explainOffer = `Changed offer to ${newOffer} as requested by user.`;

      const contentRes = await runContentAgent(stats.goal || "", campaign.segment.name, updatedChannel, updatedOffer, {
        customerCount: campaign.totalRecipients,
        aov: stats.aov || 0,
        potentialRevenue: stats.potentialRevenue || 0
      });

      updatedSubject = contentRes.subject;
      updatedBody = contentRes.body;
      explainContent = contentRes.explainContent;

      agentThoughts.push({
        step: "campaign_refinement",
        agent: "Campaign Copilot",
        reasoning: `User changed offer from ${changes.offer.before} to ${changes.offer.after}.`,
        timestamp: new Date().toISOString()
      });
      assistantMessage = `I've updated the offer to ${newOffer}.`;
    }
    else if (intent === "COPY_CHANGE") {
      const refined = await refineCopyHybrid(instruction, updatedSubject, updatedBody, explainContent);
      
      if (!refined.body || refined.body.trim().length === 0) {
         return NextResponse.json({
           assistantMessage: "I couldn't safely apply that refinement. Body cannot be empty.",
           usedLLM: false,
           workspace: buildWorkspacePayload(campaign, stats, agentThoughts)
         });
      }

      updatedSubject = refined.subject;
      updatedBody = refined.body;
      explainContent = refined.explainContent;
      usedLLM = refined.usedLLM;

      agentThoughts.push({
        step: "campaign_refinement",
        agent: "Campaign Copilot",
        reasoning: `User requested copy refinement: "${instruction}"`,
        timestamp: new Date().toISOString()
      });
      assistantMessage = `I've updated the copy based on your request.`;
    }

    // Agent thoughts bounds handling
    const MAX_REFINEMENT_HISTORY = 15;
    const originalThoughts = agentThoughts.filter((t: any) => t.step !== "campaign_refinement");
    const refinementThoughts = agentThoughts.filter((t: any) => t.step === "campaign_refinement");
    
    if (refinementThoughts.length > MAX_REFINEMENT_HISTORY) {
      const latestRefinements = refinementThoughts.slice(-MAX_REFINEMENT_HISTORY);
      agentThoughts = [...originalThoughts, ...latestRefinements];
    }

    // Final Validation
    if (!updatedBody || updatedBody.trim().length === 0) {
        return NextResponse.json({
           assistantMessage: "I couldn't safely apply that refinement. Missing message body.",
           usedLLM: false,
           workspace: buildWorkspacePayload(campaign, stats, agentThoughts)
        });
    }

    stats.offer = updatedOffer;
    stats.subject = updatedSubject;
    stats.body = updatedBody; 
    stats.explainContent = explainContent;
    stats.explainChannel = explainChannel;
    stats.explainOffer = explainOffer;
    stats.channel = updatedChannel; 

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        channel: updatedChannel,
        messageTemplate: updatedBody,
        stats,
        agentThoughts
      },
      include: { segment: true }
    });

    const finalWorkspace = buildWorkspacePayload(updatedCampaign, stats, agentThoughts);

    return NextResponse.json({
      assistantMessage,
      usedLLM,
      changes,
      workspace: finalWorkspace
    });

  } catch (error: unknown) {
    console.error(`POST /api/campaigns/[id]/refine error:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWorkspacePayload(campaign: any, stats: any, agentThoughts: any[]) {
  return {
    campaignId: campaign.id,
    goal: stats.goal || "",
    segmentId: campaign.segment.id,
    segmentName: campaign.segment.name,
    description: campaign.segment.description || "",
    customerCount: campaign.totalRecipients,
    aov: stats.aov || 0,
    potentialRevenue: stats.potentialRevenue || 0,
    opportunityReasoning: stats.opportunityReasoning || "",
    explainAudience: stats.explainAudience || "",
    channel: campaign.channel,
    offer: stats.offer || "None",
    timing: stats.timing || "Immediately",
    explainChannel: stats.explainChannel || "",
    explainOffer: stats.explainOffer || "",
    explainTiming: stats.explainTiming || "",
    subject: stats.subject || "",
    body: campaign.messageTemplate,
    explainContent: stats.explainContent || "",
    status: campaign.status,
    agentThoughts: agentThoughts,
    adaptiveInsights: stats.adaptiveInsights || null,
  };
}
