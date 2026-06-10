import { SendMessagePayload, CommunicationStatus, DeliveryCallbackPayload } from "../types";
import { CHANNEL_FLOWS } from "./probabilities";
import { sendCallback } from "./callback";

export function simulateMessage(
  payload: SendMessagePayload,
  callbackUrl: string
): void {
  console.log(
    `[Simulator] Starting simulation for "${payload.communicationId}" (${payload.channel} to ${payload.recipient.name})...`
  );

  // Helper to schedule next state transition
  const transition = (currentStatus: CommunicationStatus) => {
    const flow = CHANNEL_FLOWS[payload.channel];
    const next = flow.getNextStates(currentStatus);

    if (!next) {
      console.log(
        `[Simulator] "${payload.communicationId}" reached terminal state: "${currentStatus}".`
      );
      return;
    }

    setTimeout(async () => {
      const callbackPayload: DeliveryCallbackPayload = {
        communicationId: payload.communicationId,
        status: next.status,
        timestamp: new Date().toISOString(),
      };

      if (next.status === "failed") {
        callbackPayload.error = "Simulated delivery failure";
      }

      // Send the callback (it runs asynchronously with retry logic)
      await sendCallback(callbackUrl, callbackPayload);

      // Recurse to schedule the next transition
      transition(next.status);
    }, next.delayMs);
  };

  // Start the chain from "queued"
  transition("queued");
}
