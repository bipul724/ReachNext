import { NextRequest, NextResponse } from "next/server";
import { CampaignSender } from "@/services/campaign-sender";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Launch campaign (resolves segment, personalises, creates logs, and dispatches in background)
    const result = await CampaignSender.launch(id);

    return NextResponse.json({
      success: true,
      message: `Campaign launched successfully to ${result.sentCount} recipients.`,
      sentCount: result.sentCount,
    });
  } catch (error: any) {
    console.error(`POST /api/campaigns/[id]/launch error:`, error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
