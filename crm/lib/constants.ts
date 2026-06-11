export const CHANNELS = {
  EMAIL: "email",
  SMS: "sms",
  WHATSAPP: "whatsapp",
} as const;

export type Channel = typeof CHANNELS[keyof typeof CHANNELS];

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SENDING: "sending",
  SENT: "sent",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];

export const COMMUNICATION_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  DELIVERED: "delivered",
  OPENED: "opened",
  READ: "read",
  CLICKED: "clicked",
  CONVERTED: "converted",
  FAILED: "failed",
} as const;

export type CommunicationStatus = typeof COMMUNICATION_STATUS[keyof typeof COMMUNICATION_STATUS];
