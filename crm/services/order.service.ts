import { prisma } from "../lib/prisma";

export interface CreateOrderInput {
  customerId: string;
  orderDate: string | Date;
  totalAmount: number;
  items: any;
  storeLocation?: string;
}

export const OrderService = {
  async list({
    limit = 50,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  } = {}) {
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        take: limit,
        skip: offset,
        orderBy: { orderDate: "desc" },
        include: {
          customer: {
            select: { name: true, email: true },
          },
          attributedCampaign: {
            select: { name: true, channel: true },
          },
        },
      }),
      prisma.order.count(),
    ]);

    return { items, total };
  },

  async create(data: CreateOrderInput) {
    const orderDate = new Date(data.orderDate);

    // Run order creation, attribution, and customer updates in a single transaction
    return prisma.$transaction(async (tx) => {
      // 1. Try to attribute this order to a campaign
      // Rule: Check if customer received a message from a campaign sent in the last 7 days prior to the order date.
      const sevenDaysAgo = new Date(orderDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const latestCommunication = await tx.communication.findFirst({
        where: {
          customerId: data.customerId,
          status: { not: "failed" },
          sentAt: {
            gte: sevenDaysAgo,
            lte: orderDate,
          },
        },
        orderBy: {
          sentAt: "desc",
        },
        select: {
          campaignId: true,
        },
      });

      const attributedCampaignId = latestCommunication?.campaignId || null;

      // 2. Create the order
      const order = await tx.order.create({
        data: {
          customerId: data.customerId,
          orderDate,
          totalAmount: data.totalAmount,
          items: data.items,
          storeLocation: data.storeLocation || "online",
          attributedCampaignId,
        },
      });

      // 3. Get customer's updated order statistics
      const agg = await tx.order.aggregate({
        where: { customerId: data.customerId },
        _count: { id: true },
        _sum: { totalAmount: true },
        _max: { orderDate: true },
      });

      const totalOrders = agg._count.id || 0;
      const totalSpent = agg._sum.totalAmount || 0;
      const lastOrderAt = agg._max.orderDate || null;

      // 4. Update the Customer record
      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          totalOrders,
          totalSpent: Math.round(totalSpent * 100) / 100,
          lastOrderAt,
        },
      });

      // 5. If attributed, update the campaign stats
      if (attributedCampaignId) {
        // Find campaign to get current stats
        const campaign = await tx.campaign.findUnique({
          where: { id: attributedCampaignId },
          select: { stats: true },
        });

        if (campaign) {
          const stats = (campaign.stats as any) || {};
          const currentConverted = stats.convertedOrders || 0;
          const currentRevenue = stats.conversionRevenue || 0;

          await tx.campaign.update({
            where: { id: attributedCampaignId },
            data: {
              stats: {
                ...stats,
                convertedOrders: currentConverted + 1,
                conversionRevenue: Math.round((currentRevenue + data.totalAmount) * 100) / 100,
              },
            },
          });
        }
      }

      return order;
    });
  },
};
