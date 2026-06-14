import { NextRequest, NextResponse } from "next/server";
import { CustomerService } from "@/services/customer.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";

    const data = await CustomerService.list({ limit, offset, search });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Missing required fields: name, email" }, { status: 400 });
    }
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'name' must be a string." }, { status: 400 });
    }
    if (typeof body.email !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'email' must be a string." }, { status: 400 });
    }
    if (body.phone !== undefined && body.phone !== null && typeof body.phone !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'phone' must be a string." }, { status: 400 });
    }
    if (body.city !== undefined && body.city !== null && typeof body.city !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'city' must be a string." }, { status: 400 });
    }
    if (body.tags !== undefined && body.tags !== null && !Array.isArray(body.tags)) {
      return NextResponse.json({ error: "Invalid field type: 'tags' must be an array." }, { status: 400 });
    }

    const customer = await CustomerService.upsert(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
