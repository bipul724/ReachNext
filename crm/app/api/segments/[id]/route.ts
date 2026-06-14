import { NextRequest, NextResponse } from "next/server";
import { SegmentService } from "@/services/segment.service";

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

    return NextResponse.json(segment);
  } catch (error: any) {
    console.error(`GET /api/segments/[id] error:`, error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const segment = await SegmentService.getById(id);
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    await SegmentService.delete(id);
    return NextResponse.json({ success: true, message: "Segment deleted successfully" });
  } catch (error: any) {
    console.error(`DELETE /api/segments/[id] error:`, error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
