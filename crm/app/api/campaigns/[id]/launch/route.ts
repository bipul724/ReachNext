import { NextRequest, NextResponse, after } from "next/server";
import { CampaignSender } from "@/services/campaign-sender";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Prepare campaign: validate, create communications, update status (fast)
    const result = await CampaignSender.prepare(id);

    // Schedule the slow dispatch to run in the background after the response is sent.
    // `after()` is Vercel-aware and keeps the serverless function alive until completion.
    if (result.communications.length > 0) {
      after(async () => {
        try {
          await CampaignSender.dispatchToChannelService(result.communications);
        } catch (err) {
          console.error(`[Launch] Background dispatch failed for campaign "${id}":`, err);
          await prisma.campaign.update({
            where: { id },
            data: { status: "failed" },
          }).catch(() => {});
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Campaign launched successfully to ${result.sentCount} recipients.`,
      sentCount: result.sentCount,
    });
  } catch (error: unknown) {
    console.error(`POST /api/campaigns/[id]/launch error:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
