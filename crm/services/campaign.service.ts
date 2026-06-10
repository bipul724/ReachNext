import { prisma } from "../lib/prisma";
import { CampaignStats } from "../types";

const syncPending = new Set<string>();
const syncRunning = new Set<string>();

export interface CreateCampaignInput {
  name: string;
  segmentId: string;
  channel: string;
  messageTemplate: string;
  createdBy?: string;
}

export const CampaignService = {
  async list() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        segment: {
          select: { name: true, customerCount: true },
        },
      },
    });
  },

  async getById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        segment: true,
      },
    });
  },

  async create(data: CreateCampaignInput) {
    return prisma.campaign.create({
      data: {
        name: data.name,
        segmentId: data.segmentId,
        channel: data.channel,
        messageTemplate: data.messageTemplate,
        status: "draft",
        createdBy: data.createdBy || "user",
        stats: {},
      },
      include: {
        segment: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // Clear relations
      await tx.communication.deleteMany({ where: { campaignId: id } });
      await tx.order.updateMany({
        where: { attributedCampaignId: id },
        data: { attributedCampaignId: null },
      });
      return tx.campaign.delete({ where: { id } });
    });
  },

  /**
   * Aggregate stats for a campaign from communications and attributed orders
   * and update the campaign record with the new stats object.
   */
  async syncStats(campaignId: string) {
    // 1. Group communications by status
    const statusGroups = await prisma.communication.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { id: true },
    });

    const stats: CampaignStats = {
      queued: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      read: 0,
      clicked: 0,
      failed: 0,
      convertedOrders: 0,
      conversionRevenue: 0,
    };

    // Populate stats from database groups
    for (const group of statusGroups) {
      const status = group.status as keyof CampaignStats;
      if (status in stats) {
        (stats as any)[status] = group._count.id;
      }
    }

    // 2. Aggregate attributed order details
    const orderAgg = await prisma.order.aggregate({
      where: { attributedCampaignId: campaignId },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    stats.convertedOrders = orderAgg._count.id || 0;
    stats.conversionRevenue = Math.round((orderAgg._sum.totalAmount || 0) * 100) / 100;

    // 3. Update the campaign record, merging with existing stats to preserve AI metadata
    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { stats: true },
    });
    const mergedStats = {
      ...((existing?.stats as any) || {}),
      ...stats,
    };

    return prisma.campaign.update({
      where: { id: campaignId },
      data: {
        stats: mergedStats as any,
      },
      include: {
        segment: true,
      },
    });
  },

  async queueSyncStats(campaignId: string): Promise<void> {
    if (syncPending.has(campaignId)) {
      return;
    }

    syncPending.add(campaignId);

    setTimeout(async () => {
      syncPending.delete(campaignId);

      if (syncRunning.has(campaignId)) {
        CampaignService.queueSyncStats(campaignId);
        return;
      }

      syncRunning.add(campaignId);
      try {
        await CampaignService.syncStats(campaignId);
      } catch (err) {
        console.error(`[CampaignService] Error in queued syncStats:`, err);
      } finally {
        syncRunning.delete(campaignId);
      }
    }, 1500);
  },
};
