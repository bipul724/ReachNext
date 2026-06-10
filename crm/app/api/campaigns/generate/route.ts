import { NextResponse } from "next/server";
import { AgentOrchestrator } from "@/services/agent-orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { goal } = body;

    if (!goal || typeof goal !== "string") {
      return NextResponse.json(
        { error: "Goal is required and must be a string." },
        { status: 400 }
      );
    }

    const campaignWorkspace = await AgentOrchestrator.generateCampaign(goal);

    return NextResponse.json(campaignWorkspace, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST /api/campaigns/generate:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
