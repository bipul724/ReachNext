import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/services/campaign.service";

export async function GET() {
  try {
    const campaigns = await CampaignService.list();
    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { name, segmentId, channel, messageTemplate, createdBy } = body;

    if (!name || !segmentId || !channel || !messageTemplate) {
      return NextResponse.json(
        { error: "Missing required fields: name, segmentId, channel, messageTemplate" },
        { status: 400 }
      );
    }
    if (typeof name !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'name' must be a string." }, { status: 400 });
    }
    if (typeof segmentId !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'segmentId' must be a string." }, { status: 400 });
    }
    if (typeof channel !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'channel' must be a string." }, { status: 400 });
    }
    if (typeof messageTemplate !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'messageTemplate' must be a string." }, { status: 400 });
    }
    if (createdBy !== undefined && createdBy !== null && typeof createdBy !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'createdBy' must be a string." }, { status: 400 });
    }

    const campaign = await CampaignService.create({
      name,
      segmentId,
      channel,
      messageTemplate,
      createdBy,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
