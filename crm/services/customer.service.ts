import { prisma } from "../lib/prisma";

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  tags?: string[];
}

export const CustomerService = {
  async list({
    limit = 50,
    offset = 0,
    search = "",
  }: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, total };
  },

  async upsert(data: CreateCustomerInput) {
    return prisma.customer.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        phone: data.phone,
        city: data.city,
        tags: data.tags,
      },
      create: data,
    });
  },
};
