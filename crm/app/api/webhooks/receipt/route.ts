import { NextRequest, NextResponse } from "next/server";
import { ReceiptService } from "@/services/receipt.service";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { communicationId, status, timestamp } = body;

    if (!communicationId || !status || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields: communicationId, status, timestamp" },
        { status: 400 }
      );
    }

    const validStatuses = ["queued", "sent", "delivered", "opened", "read", "clicked", "converted", "failed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status "${status}". Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const processed = await ReceiptService.processCallback(body);

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (error: any) {
    console.error("POST /api/webhooks/receipt error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
