import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeGenerate } from "@/lib/gemini";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Fetch Campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: { select: { name: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const stats = (campaign.stats as any) || {};
    const total = campaign.totalRecipients || 0;
    const delivered = stats.delivered || 0;
    const opened = stats.opened || 0;
    const clicked = stats.clicked || 0;
    const converted = stats.convertedOrders || 0;
    const revenue = stats.conversionRevenue || 0;

    if (total === 0) {
      return NextResponse.json({
        insights: "No delivery data recorded yet. Launch the campaign to begin collecting delivery statistics and AI-native analytics.",
      });
    }

    // 2. Generate prompt for campaign insights
    const prompt = `
You are the Campaign Analytics Agent for Brew CampaignOS.
Explain the performance of this marketing campaign for the judge in 2-3 sentences.
Goal: "${stats.goal || campaign.name}"
Target Segment: "${campaign.segment.name}"
Channel: "${campaign.channel.toUpperCase()}"
Total Recipients: ${total}

Campaign Stats:
- Total Sent: ${total}
- Delivered: ${delivered} (${total > 0 ? ((delivered / total) * 100).toFixed(1) : "0.0"}% delivery rate)
- Opened/Read: ${opened} (${delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : "0.0"}% open rate)
- Clicked: ${clicked} (${opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0.0"}% click-through rate)
- Converted Orders: ${converted} (${clicked > 0 ? ((converted / clicked) * 100).toFixed(1) : "0.0"}% click-to-order rate)
- Attributed Revenue: ₹${revenue.toLocaleString()}

Highlight why this channel/campaign did well or where the dropoff happened, and provide a quick recommendation for next time. Keep it brief, professional, and outcome-driven.
`;

    const insights = await safeGenerate(prompt);

    return NextResponse.json({ insights }, { status: 200 });
  } catch (error: any) {
    console.error(`GET /api/campaigns/[id]/insights error:`, error);
    // Return fallback message on API failure
    return NextResponse.json({
      insights: "Insights are currently loading. Start the simulator and run transactions to compile complete performance graphs.",
      isFallback: true,
    });
  }
}
