import { NextRequest, NextResponse } from "next/server";
import { ReceiptService } from "@/services/receipt.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communicationId, status, timestamp } = body;

    if (!communicationId || !status || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields: communicationId, status, timestamp" },
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
