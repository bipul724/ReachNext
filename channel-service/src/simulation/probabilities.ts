import { Channel, CommunicationStatus } from "../types";

export interface SimulationState {
  status: CommunicationStatus;
  delayMs: number;
}

// Probabilities for next steps
export const CHANNEL_FLOWS: Record<
  Channel,
  {
    getNextStates: (currentStatus: CommunicationStatus) => SimulationState | null;
  }
> = {
  email: {
    getNextStates: (currentStatus: CommunicationStatus): SimulationState | null => {
      const rand = Math.random();

      switch (currentStatus) {
        case "queued":
          // 98% chance of sent, 2% of direct fail (e.g. invalid template/format)
          if (rand < 0.98) {
            return { status: "sent", delayMs: 200 + Math.random() * 800 }; // 200ms - 1s
          } else {
            return { status: "failed", delayMs: 100 };
          }

        case "sent":
          // 95% chance of delivered, 5% bounce (failed)
          if (rand < 0.95) {
            return { status: "delivered", delayMs: 1000 + Math.random() * 3000 }; // 1s - 4s
          } else {
            return { status: "failed", delayMs: 500 + Math.random() * 1000 };
          }

        case "delivered":
          // 65% chance of opened, 35% ignores the email
          if (rand < 0.65) {
            return { status: "opened", delayMs: 5000 + Math.random() * 25000 }; // 5s - 30s
          }
          return null;

        case "opened":
          // 25% chance of clicked a link in the email, 75% ignores
          if (rand < 0.25) {
            return { status: "clicked", delayMs: 3000 + Math.random() * 15000 }; // 3s - 18s
          }
          return null;

        default:
          return null;
      }
    },
  },
  sms: {
    getNextStates: (currentStatus: CommunicationStatus): SimulationState | null => {
      const rand = Math.random();

      switch (currentStatus) {
        case "queued":
          // 99% chance of sent, 1% direct fail
          if (rand < 0.99) {
            return { status: "sent", delayMs: 100 + Math.random() * 400 }; // 100ms - 500ms
          } else {
            return { status: "failed", delayMs: 50 };
          }

        case "sent":
          // 92% chance of delivered, 8% carrier error/failed
          if (rand < 0.92) {
            return { status: "delivered", delayMs: 500 + Math.random() * 1500 }; // 500ms - 2s
          } else {
            return { status: "failed", delayMs: 300 + Math.random() * 500 };
          }

        case "delivered":
          // 85% chance of read, 15% ignores
          if (rand < 0.85) {
            return { status: "read", delayMs: 2000 + Math.random() * 10000 }; // 2s - 12s
          }
          return null;

        case "read":
          // 12% click rate for SMS links
          if (rand < 0.12) {
            return { status: "clicked", delayMs: 2000 + Math.random() * 8000 }; // 2s - 10s
          }
          return null;

        default:
          return null;
      }
    },
  },
};
