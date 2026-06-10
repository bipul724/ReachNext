import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/services/order.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const data = await OrderService.list({ limit, offset });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, totalAmount, items, orderDate, storeLocation } = body;

    if (!customerId || totalAmount === undefined || !items) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, totalAmount, items" },
        { status: 400 }
      );
    }

    const order = await OrderService.create({
      customerId,
      totalAmount: parseFloat(totalAmount),
      items,
      orderDate: orderDate || new Date(),
      storeLocation,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
