import { NextRequest, NextResponse } from "next/server";
import { SegmentService } from "@/services/segment.service";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { rules } = body;

    if (!rules) {
      return NextResponse.json({ error: "Missing segment rules" }, { status: 400 });
    }

    const [count, customers] = await Promise.all([
      SegmentService.getPreviewCount(rules),
      SegmentService.getPreviewCustomers(rules, 15),
    ]);

    return NextResponse.json({
      count,
      customers,
    });
  } catch (error: unknown) {
    console.error("POST /api/segments/preview error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
