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
    const body = await request.json();
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Missing required fields: name, email" }, { status: 400 });
    }

    const customer = await CustomerService.upsert(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
