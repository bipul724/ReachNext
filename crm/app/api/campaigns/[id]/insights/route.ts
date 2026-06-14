import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCampaignInsight, type CampaignInsight } from "@/services/insights.service";
import type { CampaignStats } from "@/lib/gemini-insights";

// Fallback shape used if a campaign's `stats` JSON is missing/incomplete
// (e.g. a brand-new campaign that hasn't been launched yet).
const EMPTY_STATS: CampaignStats = {
  queued: 0,
  sent: 0,
  delivered: 0,
  opened: 0,
  read: 0,
  clicked: 0,
  failed: 0,
  convertedOrders: 0,
  conversionRevenue: 0,
};

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const stats: CampaignStats = {
      ...EMPTY_STATS,
      ...((campaign.stats as Partial<CampaignStats>) ?? {}),
    };

    // Safe extraction of the human-readable marketing goal from campaign stats or segment
    const goal = (campaign.stats as Record<string, unknown>)?.goal as string ?? campaign.segment?.naturalLanguageQuery ?? "";

    const insight: CampaignInsight = await getCampaignInsight({
      campaignId: campaign.id,
      campaignName: campaign.name,
      goal,
      channel: campaign.channel ?? "UNKNOWN",
      segmentName: campaign.segment?.name ?? "Unknown segment",
      stats,
    });

    // Format for frontend page.tsx consumption (expects a single `insights` string)
    const formattedInsights = `${insight.summary}\n\n💡 Next Step Suggestion:\n${insight.nextStep}`;

    return NextResponse.json({
      insights: formattedInsights,
      summary: insight.summary,
      nextStep: insight.nextStep,
      source: insight.source,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/campaigns/[id]/insights error:", error);
    return NextResponse.json(
      {
        insights: "Insights are currently loading. Start the simulator and run transactions to compile complete performance graphs.",
        summary: "Insights are currently loading.",
        nextStep: "Check back once the campaign has finished sending.",
        source: "programmatic",
      },
      { status: 500 }
    );
  }
}
