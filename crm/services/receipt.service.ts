import { prisma } from "../lib/prisma";
import { CampaignService } from "./campaign.service";
import { CommunicationStatus } from "../types";

// State hierarchy order to handle out-of-order callbacks
const STATUS_PRIORITY: Record<CommunicationStatus, number> = {
  queued: 1,
  sent: 2,
  delivered: 3,
  read: 4, // SMS read
  opened: 4, // Email opened
  clicked: 5, // Clicked links
  failed: 6, // Failed (terminal)
};

export const ReceiptService = {
  async processCallback(payload: {
    communicationId: string;
    status: CommunicationStatus;
    timestamp: string;
    error?: string;
  }): Promise<boolean> {
    const { communicationId, status, timestamp, error } = payload;
    const callbackDate = new Date(timestamp);

    // 1. Fetch communication log
    const comm = await prisma.communication.findUnique({
      where: { id: communicationId },
    });

    if (!comm) {
      console.warn(`[ReceiptService] Communication log "${communicationId}" not found.`);
      return false;
    }

    const currentStatus = comm.status as CommunicationStatus;

    // 2. Idempotency Check: Verify if new status is a valid forward transition
    const currentPriority = STATUS_PRIORITY[currentStatus] || 0;
    const newPriority = STATUS_PRIORITY[status] || 0;

    // Do not transition backward in status priority (e.g., clicked -> delivered is ignored)
    // Exception: If the current status is 'failed', it's terminal and cannot be changed.
    if (currentStatus === "failed") {
      console.log(`[ReceiptService] Ignored callback for "${communicationId}": already marked as failed.`);
      return false;
    }

    if (newPriority <= currentPriority) {
      console.log(
        `[ReceiptService] Ignored callback for "${communicationId}": transition from "${currentStatus}" to "${status}" is not allowed.`
      );
      return false;
    }

    // 3. Prepare updates
    const updateData: any = {
      status,
    };

    // Map timestamps based on status
    if (status === "sent") {
      updateData.sentAt = callbackDate;
    } else if (status === "delivered") {
      updateData.deliveredAt = callbackDate;
    } else if (status === "opened") {
      updateData.openedAt = callbackDate;
    } else if (status === "read") {
      updateData.readAt = callbackDate;
    } else if (status === "clicked") {
      updateData.clickedAt = callbackDate;
      // Mark as opened or read if not already done, just in case
      if (!comm.openedAt && comm.channel === "email") updateData.openedAt = callbackDate;
      if (!comm.readAt && comm.channel === "sms") updateData.readAt = callbackDate;
    } else if (status === "failed") {
      updateData.failedAt = callbackDate;
    }

    // Update status history list
    let historyList = [];
    try {
      historyList = typeof comm.statusHistory === "string" 
        ? JSON.parse(comm.statusHistory) 
        : (comm.statusHistory as any[]) || [];
    } catch {
      historyList = [];
    }

    historyList.push({
      status,
      timestamp: callbackDate.toISOString(),
      ...(error ? { error } : {}),
    });

    updateData.statusHistory = JSON.stringify(historyList);

    // 4. Update communication log
    await prisma.communication.update({
      where: { id: communicationId },
      data: updateData,
    });

    console.log(
      `[ReceiptService] Updated communication "${communicationId}" status: "${currentStatus}" -> "${status}".`
    );

    // 5. Trigger Campaign statistics sync in the background
    // (We run it non-blocking to respond to the webhook rapidly)
    CampaignService.syncStats(comm.campaignId).catch((err) => {
      console.error(`[ReceiptService] Error syncing stats for campaign "${comm.campaignId}":`, err);
    });

    return true;
  },
};
