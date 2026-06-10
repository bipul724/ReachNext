import { NextRequest, NextResponse } from "next/server";
import { SegmentService } from "@/services/segment.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
  } catch (error: any) {
    console.error("POST /api/segments/preview error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
