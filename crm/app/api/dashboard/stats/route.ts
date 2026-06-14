import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalCustomers,
      totalCampaigns,
      orderAgg,
      locationGroups,
      recentCampaigns,
      recentOrders,
    ] = await Promise.all([
      // Total Customers
      prisma.customer.count(),
      // Total Campaigns
      prisma.campaign.count(),
      // Total Orders & Revenue
      prisma.order.aggregate({
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      // Sales by location
      prisma.order.groupBy({
        by: ["storeLocation"],
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Recent Campaigns
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          segment: { select: { name: true } },
        },
      }),
      // Recent Orders
      prisma.order.findMany({
        take: 5,
        orderBy: { orderDate: "desc" },
        include: {
          customer: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Calculate revenue & orders safely
    const totalOrders = orderAgg._count.id || 0;
    const totalRevenue = Math.round((orderAgg._sum.totalAmount || 0) * 100) / 100;

    // Format location sales chart data
    const locationSales = locationGroups.map((group: typeof locationGroups[number]) => ({
      name: group.storeLocation === "online" ? "Online" : group.storeLocation,
      orders: group._count.id,
      sales: Math.round((group._sum.totalAmount || 0) * 100) / 100,
    }));

    return NextResponse.json({
      summary: {
        totalCustomers,
        totalCampaigns,
        totalOrders,
        totalRevenue,
      },
      locationSales,
      recentCampaigns,
      recentOrders,
    });
  } catch (error: unknown) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

