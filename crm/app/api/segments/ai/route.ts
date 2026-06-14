import { NextResponse } from "next/server";
import { runSegmentationAgent } from "@/ai/segmentation";

export async function POST(request: Request) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { prompt } = payload || {};

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string." },
        { status: 400 }
      );
    }

    const segmentation = await runSegmentationAgent(prompt);

    return NextResponse.json(segmentation, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in POST /api/segments/ai:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
