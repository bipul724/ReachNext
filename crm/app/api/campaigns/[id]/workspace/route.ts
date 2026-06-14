import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWorkspacePayload } from "../refine/route";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: Record<string, any> = (campaign.stats as Record<string, any>) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentThoughts: any[] = (campaign.agentThoughts as any[]) || [];

    const workspace = buildWorkspacePayload(campaign, stats, agentThoughts);

    return NextResponse.json({ workspace });
  } catch (error: unknown) {
    console.error(`GET /api/campaigns/[id]/workspace error:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
