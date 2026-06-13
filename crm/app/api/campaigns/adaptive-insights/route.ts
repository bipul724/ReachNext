import { NextResponse } from "next/server";
import { getAdaptiveRecommendations } from "@/ai/adaptive-recommendation";

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

    const insights = await getAdaptiveRecommendations(goal);
    return NextResponse.json(insights, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST /api/campaigns/adaptive-insights:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
