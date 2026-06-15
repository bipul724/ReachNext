import { prisma } from "../lib/prisma";
import { SegmentEngine } from "./segment-engine";
import { CampaignService } from "./campaign.service";
import { SendMessagePayload } from "../types";
import { generateBatchMessages } from "../ai/content";

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || "http://localhost:3001";
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || "http://localhost:3000/api/webhooks/receipt";

export const CampaignSender = {
  /**
   * Prepare a campaign for launch: validate, create communications, update status.
   * Returns the communications list for dispatch. This is the fast, synchronous part.
   * The caller is responsible for dispatching via `dispatchToChannelService` (e.g., using `after()`).
   */
  async prepare(campaignId: string): Promise<{ success: boolean; sentCount: number; communications: any[] }> {
    // 1. Get campaign and segment details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { segment: true },
    });

    if (!campaign) {
      throw new Error(`Campaign with ID "${campaignId}" not found`);
    }

    if (campaign.status !== "draft") {
      throw new Error(`Campaign is in "${campaign.status}" status and cannot be launched.`);
    }

    // Update status to sending
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

    try {
      // 2. Fetch all customers matching the segment rules
      const rules = campaign.segment.rules as any;
      const where = SegmentEngine.buildWhereClause(rules);
      const customers = await prisma.customer.findMany({ where });

      const sentCount = customers.length;

      if (sentCount === 0) {
        // No recipients, complete campaign immediately
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: "completed",
            totalRecipients: 0,
            sentAt: new Date(),
            completedAt: new Date(),
          },
        });
        return { success: true, sentCount: 0, communications: [] };
      }

      // 3. Generate personalized messages and prepare communications list
      console.log(`[CampaignSender] Running batch personalization for ${customers.length} customers...`);
      const batchResult = await generateBatchMessages(
        customers.map((c: typeof customers[number]) => ({
          id: c.id,
          name: c.name,
          city: c.city,
          totalSpent: c.totalSpent,
          totalOrders: c.totalOrders
        })),
        campaign.messageTemplate,
        (campaign.stats as any)?.offer || "15% OFF",
        campaign.channel as any
      );

      const communicationsData = customers.map((customer: typeof customers[number]) => {
        const personalisedMessage = batchResult.find(r => r.customerId === customer.id)?.message || 
          this.personalize(campaign.messageTemplate, customer);

        return {
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          personalisedMessage,
          status: "queued",
          statusHistory: JSON.stringify([{ status: "queued", timestamp: new Date().toISOString() }]),
        };
      });

      // 4. Bulk insert communications
      await prisma.communication.createMany({
        data: communicationsData,
      });

      // Retrieve the generated communications with IDs to send to channel service
      const communications = await prisma.communication.findMany({
        where: {
          campaignId: campaign.id,
          status: "queued",
        },
        include: {
          customer: {
            select: { name: true, email: true, phone: true },
          },
        },
      });

      // 5. Update Campaign with total recipients and mark as "sent" immediately
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "sent",
          totalRecipients: sentCount,
          sentAt: new Date(),
        },
      });

      return { success: true, sentCount, communications };
    } catch (error) {
      console.error(`Error preparing campaign "${campaignId}":`, error);
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed" },
      }).catch(() => {});
      throw error;
    }
  },

  personalize(template: string, customer: any): string {
    return template
      .replace(/\[Name\]/g, customer.name)
      .replace(/\[City\]/g, customer.city || "your city")
      .replace(/\[TotalSpent\]/g, `₹${Math.round(customer.totalSpent)}`)
      .replace(/\[TotalOrders\]/g, String(customer.totalOrders));
  },

  async dispatchToChannelService(communications: any[]): Promise<void> {
    console.log(`[CampaignSender] Dispatching ${communications.length} messages to channel service...`);

    const batchSize = 20; // dispatch in small batches of 20
    for (let i = 0; i < communications.length; i += batchSize) {
      const batch = communications.slice(i, i + batchSize);

      // Map communication to payload structure
      const promises = batch.map(async (comm) => {
        const payload: SendMessagePayload = {
          communicationId: comm.id,
          recipient: {
            name: comm.customer.name,
            email: comm.customer.email,
            phone: comm.customer.phone,
          },
          message: comm.personalisedMessage,
          channel: comm.channel,
          callbackUrl: CRM_WEBHOOK_URL,
        };

        try {
          const res = await fetch(`${CHANNEL_SERVICE_URL}/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw new Error(`Failed to send message. HTTP status: ${res.status}`);
          }
        } catch (err: any) {
          console.error(
            `[CampaignSender] Error sending communication "${comm.id}" to channel service:`,
            err?.message || err
          );

          // Update status to failed directly if we couldn't contact channel service
          await prisma.communication.update({
            where: { id: comm.id },
            data: {
              status: "failed",
              failedAt: new Date(),
              statusHistory: JSON.stringify([
                ...JSON.parse(comm.statusHistory),
                { status: "failed", timestamp: new Date().toISOString(), error: "Failed to dispatch to delivery channel" },
              ]),
            },
          });
        }
      });

      // Wait for the current batch to be submitted before proceeding to next batch
      await Promise.all(promises);
      
      // Sync campaign stats incrementally to show active progress
      if (communications.length > 0) {
        await CampaignService.syncStats(communications[0].campaignId).catch((err) => {
          console.error("[CampaignSender] Error syncing stats incrementally:", err);
        });
      }
    }

    console.log(`[CampaignSender] Dispatch complete.`);
  },
};
