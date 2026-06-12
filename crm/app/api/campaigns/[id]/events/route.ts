import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  error?: string;
}

interface DeliveryEvent {
  communicationId: string;
  customerName: string;
  status: string;
  channel: string;
  timestamp: string;
  attributedRevenue: number | null;
}

/**
 * GET /api/campaigns/[id]/events
 *
 * Returns the most recent 50 delivery lifecycle events for a campaign,
 * derived from the statusHistory JSON already persisted on each Communication.
 *
 * Read-only — no writes, no side effects, no stats recalculation.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Query 1: Fetch the most recently-updated communications (capped at 100).
    // Ordering by the latest timestamp field gives us the communications with
    // the freshest activity first, so flattening + slicing produces the newest
    // 50 events without loading every communication in a large campaign.
    const communications = await prisma.communication.findMany({
      where: { campaignId: id },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        channel: true,
        statusHistory: true,
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // Query 2: Batch-fetch attributed orders for revenue lookup.
    // Single query, no N+1.
    const orders = await prisma.order.findMany({
      where: { attributedCampaignId: id },
      select: {
        customerId: true,
        totalAmount: true,
      },
    });

    // Build a revenue lookup map: customerId → total attributed revenue
    const revenueByCustomer = new Map<string, number>();
    for (const order of orders) {
      const prev = revenueByCustomer.get(order.customerId) || 0;
      revenueByCustomer.set(order.customerId, prev + order.totalAmount);
    }

    // Flatten statusHistory entries into individual events
    const events: DeliveryEvent[] = [];

    for (const comm of communications) {
      // Parse statusHistory safely (handles both string and object forms from Prisma Json)
      let history: StatusHistoryEntry[] = [];
      try {
        const raw = comm.statusHistory;
        if (typeof raw === "string") {
          history = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          history = raw as unknown as StatusHistoryEntry[];
        }
      } catch {
        // Malformed history — skip this communication gracefully
        continue;
      }

      if (!Array.isArray(history)) continue;

      for (const entry of history) {
        if (!entry.status || !entry.timestamp) continue;

        const isConverted = entry.status.toLowerCase() === "converted";

        events.push({
          communicationId: comm.id,
          customerName: comm.customer?.name || "Unknown",
          status: entry.status.toUpperCase(),
          channel: comm.channel?.toUpperCase() || "UNKNOWN",
          timestamp: entry.timestamp,
          attributedRevenue: isConverted
            ? revenueByCustomer.get(comm.customer?.id) || null
            : null,
        });
      }
    }

    // Sort newest first, cap at 50
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedEvents = events.slice(0, 50);

    return NextResponse.json({ events: limitedEvents });
  } catch (error: any) {
    console.error("GET /api/campaigns/[id]/events error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
