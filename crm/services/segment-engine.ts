import { Prisma } from "@prisma/client";
import { SegmentRulesJson, SegmentRule } from "../types";

export const SegmentEngine = {
  buildWhereClause(rulesJson: SegmentRulesJson): Prisma.CustomerWhereInput {
    if (!rulesJson || !rulesJson.and || !Array.isArray(rulesJson.and)) {
      return {};
    }

    const conditions: Prisma.CustomerWhereInput[] = [];

    for (const rule of rulesJson.and) {
      const condition = this.parseRule(rule);
      if (condition) {
        conditions.push(condition);
      }
    }

    if (conditions.length === 0) {
      return {};
    }

    return {
      AND: conditions,
    };
  },

  parseRule(rule: SegmentRule): Prisma.CustomerWhereInput | null {
    const { field, op, value } = rule;

    // Helper to parse numeric values safely
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    switch (field) {
      case "totalSpent":
        return {
          totalSpent: this.buildNumericFilter(op, numValue),
        };

      case "totalOrders":
        return {
          totalOrders: this.buildNumericFilter(op, numValue),
        };

      case "city":
        if (op === "eq") {
          return {
            city: { equals: String(value), mode: "insensitive" as const },
          };
        } else if (op === "contains") {
          return {
            city: { contains: String(value), mode: "insensitive" as const },
          };
        }
        return null;

      case "daysSinceLastOrder": {
        // daysSinceLastOrder > X means lastOrderAt < (now - X days)
        // daysSinceLastOrder < X means lastOrderAt > (now - X days)
        const days = numValue;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - days);

        if (op === "gt" || op === "gte") {
          return {
            lastOrderAt: { lte: targetDate, not: null },
          };
        } else if (op === "lt" || op === "lte") {
          return {
            lastOrderAt: { gte: targetDate, not: null },
          };
        } else if (op === "eq") {
          // Approximate day match
          const startOfDay = new Date(targetDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(targetDate);
          endOfDay.setHours(23, 59, 59, 999);
          return {
            lastOrderAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          };
        }
        return null;
      }

      case "lastOrderAt":
      case "createdAt": {
        let dateValue: Date;

        if (String(value).endsWith("_days_ago")) {
          const days = parseInt(String(value).split("_")[0], 10);
          dateValue = new Date();
          dateValue.setDate(dateValue.getDate() - days);
        } else {
          dateValue = new Date(String(value));
        }

        const dateFilter = this.buildDateFilter(op, dateValue);
        return field === "lastOrderAt"
          ? { lastOrderAt: dateFilter }
          : { createdAt: dateFilter };
      }

      default:
        return null;
    }
  },

  buildNumericFilter(op: string, value: number) {
    switch (op) {
      case "gt":
        return { gt: value };
      case "lt":
        return { lt: value };
      case "gte":
        return { gte: value };
      case "lte":
        return { lte: value };
      case "eq":
      default:
        return { equals: value };
    }
  },

  buildDateFilter(op: string, value: Date) {
    switch (op) {
      case "gt":
        return { gt: value };
      case "lt":
        return { lt: value };
      case "gte":
        return { gte: value };
      case "lte":
        return { lte: value };
      case "eq":
      default:
        return { equals: value };
    }
  },
};
