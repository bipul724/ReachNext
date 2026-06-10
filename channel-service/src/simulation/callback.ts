import { DeliveryCallbackPayload } from "../types";

export async function sendCallback(
  callbackUrl: string,
  payload: DeliveryCallbackPayload,
  attempt = 1,
  maxAttempts = 3
): Promise<void> {
  const delayMs = attempt === 1 ? 0 : Math.pow(2, attempt) * 1000; // exponential backoff: 4s, 8s...

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.log(
    `[Callback] Sending status "${payload.status}" for communication "${payload.communicationId}" (Attempt ${attempt}/${maxAttempts})...`
  );

  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(
      `[Callback] Successfully delivered "${payload.status}" callback for "${payload.communicationId}".`
    );
  } catch (error: any) {
    console.error(
      `[Callback] Failed to send callback for "${payload.communicationId}" (Attempt ${attempt}/${maxAttempts}):`,
      error?.message || error
    );

    if (attempt < maxAttempts) {
      // Run retry in background so it doesn't block the simulator loop
      sendCallback(callbackUrl, payload, attempt + 1, maxAttempts).catch(
        (err) => {
          console.error(
            `[Callback] Fatal error in retry flow for "${payload.communicationId}":`,
            err
          );
        }
      );
    } else {
      console.error(
        `[Callback] Max attempts reached. Callback for "${payload.communicationId}" failed permanently.`
      );
    }
  }
}
