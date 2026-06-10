import { NextRequest, NextResponse } from "next/server";
import { SegmentService } from "@/services/segment.service";

export async function GET() {
  try {
    const segments = await SegmentService.list();
    return NextResponse.json(segments);
  } catch (error: any) {
    console.error("GET /api/segments error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, rules, naturalLanguageQuery, createdBy } = body;

    if (!name || !rules) {
      return NextResponse.json({ error: "Missing required fields: name, rules" }, { status: 400 });
    }

    const segment = await SegmentService.create({
      name,
      description,
      rules,
      naturalLanguageQuery,
      createdBy,
    });

    return NextResponse.json(segment, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/segments error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
