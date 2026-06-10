import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/services/campaign.service";

export async function GET() {
  try {
    const campaigns = await CampaignService.list();
    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, segmentId, channel, messageTemplate, createdBy } = body;

    if (!name || !segmentId || !channel || !messageTemplate) {
      return NextResponse.json(
        { error: "Missing required fields: name, segmentId, channel, messageTemplate" },
        { status: 400 }
      );
    }

    const campaign = await CampaignService.create({
      name,
      segmentId,
      channel,
      messageTemplate,
      createdBy,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
