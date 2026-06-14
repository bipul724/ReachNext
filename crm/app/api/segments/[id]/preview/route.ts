import { NextRequest, NextResponse } from "next/server";
import { SegmentService } from "@/services/segment.service";
import type { SegmentRulesJson } from "@/types";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const segment = await SegmentService.getById(id);

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    const rules = segment.rules as unknown as SegmentRulesJson;
    const previewCustomers = await SegmentService.getPreviewCustomers(rules, 20);

    return NextResponse.json({
      segmentId: id,
      count: segment.customerCount,
      customers: previewCustomers,
    });
  } catch (error: unknown) {
    console.error(`GET /api/segments/[id]/preview error:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
