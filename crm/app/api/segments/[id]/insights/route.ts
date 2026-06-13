import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runSegmentInsightsAgent,
  SegmentPerformanceFacts,
} from "@/ai/segment-insights";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch segment with its campaigns (include stats)
    const segment = await prisma.segment.findUnique({
      where: { id },
      include: {
        campaigns: {
          where: { status: { not: "draft" } },
          select: {
            id: true,
            name: true,
            channel: true,
            totalRecipients: true,
            stats: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment not found" },
        { status: 404 }
      );
    }

    if (segment.campaigns.length === 0) {
      return NextResponse.json(
        { error: "No launched campaigns found for this segment." },
        { status: 400 }
      );
    }

    // --- Compute deterministic facts ---

    const campaignFacts = segment.campaigns.map((c) => {
      const s = (c.stats as any) || {};
      const sent = s.sent || 0;
      const delivered = s.delivered || 0;
      const opened = s.opened || 0;
      const clicked = s.clicked || 0;
      const conversions = s.convertedOrders || 0;
      const revenue = s.conversionRevenue || 0;

      return {
        name: c.name,
        channel: c.channel,
        openRate: delivered > 0 ? Math.round(((opened / delivered) * 100) * 10) / 10 : 0,
        ctr: opened > 0 ? Math.round(((clicked / opened) * 100) * 10) / 10 : 0,
        conversions,
        revenue,
      };
    });

    const totalConversions = campaignFacts.reduce((sum, c) => sum + c.conversions, 0);
    const totalRevenue = campaignFacts.reduce((sum, c) => sum + c.revenue, 0);
    const avgOpenRate =
      campaignFacts.length > 0
        ? Math.round((campaignFacts.reduce((sum, c) => sum + c.openRate, 0) / campaignFacts.length) * 10) / 10
        : 0;
    const avgCtr =
      campaignFacts.length > 0
        ? Math.round((campaignFacts.reduce((sum, c) => sum + c.ctr, 0) / campaignFacts.length) * 10) / 10
        : 0;

    const facts: SegmentPerformanceFacts = {
      segmentName: segment.name,
      customerCount: segment.customerCount,
      campaignCount: segment.campaigns.length,
      campaigns: campaignFacts,
      aggregates: {
        avgOpenRate,
        avgCtr,
        totalConversions,
        totalRevenue,
      },
    };

    // --- Determine best campaign deterministically (by revenue, then open rate) ---

    let bestCampaign = null;
    if (campaignFacts.length > 0) {
      const sorted = [...campaignFacts].sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.openRate - a.openRate;
      });
      bestCampaign = sorted[0];
    }

    // --- Generate AI insight ---

    const insights = await runSegmentInsightsAgent(facts);

    return NextResponse.json({ facts, bestCampaign, insights }, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/segments/[id]/insights:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
