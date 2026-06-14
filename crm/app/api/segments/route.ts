import { NextRequest, NextResponse } from "next/server";
import { SegmentService } from "@/services/segment.service";

export async function GET() {
  try {
    const segments = await SegmentService.list();
    return NextResponse.json(segments);
  } catch (error: unknown) {
    console.error("GET /api/segments error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { name, description, rules, naturalLanguageQuery, createdBy } = body;

    if (!name || !rules) {
      return NextResponse.json({ error: "Missing required fields: name, rules" }, { status: 400 });
    }
    if (typeof name !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'name' must be a string." }, { status: 400 });
    }
    if (typeof rules !== "object" || Array.isArray(rules) || rules === null) {
      return NextResponse.json({ error: "Invalid field type: 'rules' must be an object." }, { status: 400 });
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'description' must be a string." }, { status: 400 });
    }
    if (naturalLanguageQuery !== undefined && naturalLanguageQuery !== null && typeof naturalLanguageQuery !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'naturalLanguageQuery' must be a string." }, { status: 400 });
    }
    if (createdBy !== undefined && createdBy !== null && typeof createdBy !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'createdBy' must be a string." }, { status: 400 });
    }

    const segment = await SegmentService.create({
      name,
      description,
      rules,
      naturalLanguageQuery,
      createdBy,
    });

    return NextResponse.json(segment, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/segments error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
