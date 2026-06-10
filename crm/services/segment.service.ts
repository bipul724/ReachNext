import { prisma } from "../lib/prisma";
import { SegmentEngine } from "./segment-engine";
import { SegmentRulesJson } from "../types";

export interface CreateSegmentInput {
  name: string;
  description?: string | null;
  rules: SegmentRulesJson;
  naturalLanguageQuery?: string | null;
  createdBy?: string;
}

export const SegmentService = {
  async list() {
    return prisma.segment.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.segment.findUnique({
      where: { id },
    });
  },

  async create(data: CreateSegmentInput) {
    // 1. Calculate customer count matching the segment
    const where = SegmentEngine.buildWhereClause(data.rules);
    const customerCount = await prisma.customer.count({ where });

    // 2. Save segment to database
    return prisma.segment.create({
      data: {
        name: data.name,
        description: data.description || null,
        rules: data.rules as any,
        naturalLanguageQuery: data.naturalLanguageQuery || null,
        customerCount,
        createdBy: data.createdBy || "user",
      },
    });
  },

  async getPreviewCount(rules: SegmentRulesJson) {
    const where = SegmentEngine.buildWhereClause(rules);
    return prisma.customer.count({ where });
  },

  async getPreviewCustomers(rules: SegmentRulesJson, limit = 10) {
    const where = SegmentEngine.buildWhereClause(rules);
    return prisma.customer.findMany({
      where,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        totalOrders: true,
        totalSpent: true,
      },
      orderBy: { totalSpent: "desc" },
    });
  },

  async delete(id: string) {
    // Check if any campaigns reference this segment
    const campaignCount = await prisma.campaign.count({
      where: { segmentId: id },
    });

    if (campaignCount > 0) {
      throw new Error(
        `Cannot delete segment — ${campaignCount} campaign(s) are using it. Delete those campaigns first.`
      );
    }

    return prisma.segment.delete({
      where: { id },
    });
  },
};
