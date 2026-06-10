export type Channel = "email" | "sms";

export type CommunicationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "read"
  | "clicked"
  | "failed";

export interface SendMessagePayload {
  communicationId: string;
  recipient: {
    email: string;
    phone?: string | null;
    name: string;
  };
  message: string;
  channel: Channel;
  callbackUrl?: string;
}

export interface DeliveryCallbackPayload {
  communicationId: string;
  status: CommunicationStatus;
  timestamp: string;
  error?: string;
}
