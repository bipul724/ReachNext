import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/services/order.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const data = await OrderService.list({ limit, offset });
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("GET /api/orders error:", error);
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
    const { customerId, totalAmount, items, orderDate, storeLocation } = body;

    if (!customerId || totalAmount === undefined || !items) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, totalAmount, items" },
        { status: 400 }
      );
    }
    if (typeof customerId !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'customerId' must be a string." }, { status: 400 });
    }
    if (typeof totalAmount !== "number" && typeof totalAmount !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'totalAmount' must be a number or string." }, { status: 400 });
    }
    if (typeof items !== "object" || items === null) {
      return NextResponse.json({ error: "Invalid field type: 'items' must be an array or object." }, { status: 400 });
    }
    if (orderDate !== undefined && orderDate !== null && typeof orderDate !== "string" && typeof orderDate !== "number") {
      return NextResponse.json({ error: "Invalid field type: 'orderDate' must be a string or number." }, { status: 400 });
    }
    if (storeLocation !== undefined && storeLocation !== null && typeof storeLocation !== "string") {
      return NextResponse.json({ error: "Invalid field type: 'storeLocation' must be a string." }, { status: 400 });
    }

    const order = await OrderService.create({
      customerId,
      totalAmount: typeof totalAmount === "string" ? parseFloat(totalAmount) : totalAmount,
      items,
      orderDate: orderDate || new Date(),
      storeLocation,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
