import { NextResponse } from "next/server";
import { runCompareInsightsAgent, ComparisonFacts } from "@/ai/compare";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const facts: ComparisonFacts | undefined = body?.facts;

    // --- Validate request shape ---

    if (!facts || typeof facts !== "object") {
      return NextResponse.json(
        { error: "Request body must include a 'facts' object." },
        { status: 400 }
      );
    }

    if (!Array.isArray(facts.campaigns) || facts.campaigns.length < 2) {
      return NextResponse.json(
        { error: "At least 2 campaigns are required for comparison." },
        { status: 400 }
      );
    }

    // --- Generate insights via Groq ---

    const insights = await runCompareInsightsAgent(facts);

    return NextResponse.json(insights, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST /api/compare/insights:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
