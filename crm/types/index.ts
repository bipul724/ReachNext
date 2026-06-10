import { Channel, CampaignStatus, CommunicationStatus } from "../lib/constants";
export type { Channel, CampaignStatus, CommunicationStatus };

export interface SegmentRule {
  field: "totalSpent" | "totalOrders" | "lastOrderAt" | "createdAt" | "city" | "daysSinceLastOrder";
  op: "gt" | "lt" | "gte" | "lte" | "eq" | "contains";
  value: string | number;
}

export interface SegmentRulesJson {
  and: SegmentRule[];
}

export interface CampaignStats {
  queued: number;
  sent: number;
  delivered: number;
  opened?: number;
  read?: number;
  clicked?: number;
  failed: number;
  convertedOrders?: number;
  conversionRevenue?: number;
}

export interface DeliveryCallbackPayload {
  communicationId: string;
  status: CommunicationStatus;
  timestamp: string;
  error?: string;
}

export interface SendMessagePayload {
  communicationId: string;
  recipient: {
    email: string;
    phone?: string | null;
    name: string;
  };
  message: string;
  channel: Channel;
  callbackUrl: string;
}

export interface AgentThought {
  step: string;
  agent: string;
  reasoning: string;
  timestamp: string;
}

