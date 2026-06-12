import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/campaigns/[id]/audience-preview
 *
 * Returns a snapshot of representative customers reached by this campaign,
 * derived from existing Communication records (created at launch time).
 *
 * Read-only — no writes, no side effects, no re-segmentation.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Fetch campaign with segment for targeting rationale
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        totalRecipients: true,
        segment: {
          select: {
            name: true,
            naturalLanguageQuery: true,
            description: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Derive audience from existing Communications (created at launch).
    // Distinct on customerId, sorted by highest spend, capped at 5.
    const communications = await prisma.communication.findMany({
      where: { campaignId: id },
      distinct: ["customerId"],
      take: 5,
      orderBy: {
        customer: {
          totalSpent: "desc",
        },
      },
      select: {
        customer: {
          select: {
            name: true,
            city: true,
            totalSpent: true,
            lastOrderAt: true,
          },
        },
      },
    });

    // Map to response shape
    const now = Date.now();
    const customers = communications.map((comm) => {
      const c = comm.customer;
      const daysSinceLastOrder = c.lastOrderAt
        ? Math.floor((now - new Date(c.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        name: c.name,
        city: c.city || null,
        totalSpent: c.totalSpent,
        daysSinceLastOrder,
      };
    });

    return NextResponse.json({
      totalAudience: campaign.totalRecipients,
      segmentName: campaign.segment?.name || null,
      targetingRationale: campaign.segment?.naturalLanguageQuery || campaign.segment?.description || null,
      customers,
    });
  } catch (error: any) {
    console.error("GET /api/campaigns/[id]/audience-preview error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
