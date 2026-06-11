import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const convRate = clicked > 0 ? (converted / clicked) * 100 : 0;

    const segmentName = campaign.segment.name;
    const channelName = campaign.channel.toUpperCase();

    let insights = `This campaign successfully targeted the "${segmentName}" segment via ${channelName}. `;
    if (converted > 0) {
      insights += `It achieved an excellent conversion rate of ${convRate.toFixed(1)}% from link clicks, generating ₹${revenue.toLocaleString("en-IN")} in total revenue from ${converted} attributed orders. `;
      if (clickRate < 20) {
        insights += `While order conversion was strong, click-through rates were relatively low (${clickRate.toFixed(1)}%), suggesting a clearer call-to-action or link placement could improve engagement next time.`;
      } else {
        insights += `Performance was highly optimized across the funnel, showing strong customer interest and high brand engagement.`;
      }
    } else {
      insights += `Messages were successfully dispatched (${delivered} delivered), but no conversion orders have been recorded yet. Start the transaction simulator to attribute sales and compile revenue figures.`;
    }

    return NextResponse.json({ insights }, { status: 200 });
  } catch (error: any) {
    console.error(`GET /api/campaigns/[id]/insights error:`, error);
    return NextResponse.json({
      insights: "Insights are currently loading. Start the simulator and run transactions to compile complete performance graphs.",
      isFallback: true,
    });
  }
}
