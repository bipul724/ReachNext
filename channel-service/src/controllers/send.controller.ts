import { Request, Response } from "express";
import { SendMessagePayload } from "../types";
import { simulateMessage } from "../simulation/simulator";
import { env } from "../config/env";

export const handleSend = (req: Request, res: Response): void => {
  const { communicationId, recipient, message, channel, callbackUrl } =
    req.body as SendMessagePayload;

  // Simple validation
  if (!communicationId || !recipient || !message || !channel) {
    res.status(400).json({
      error: "Missing required fields: communicationId, recipient, message, channel",
    });
    return;
  }

  if (channel !== "email" && channel !== "sms" && channel !== "whatsapp") {
    res.status(400).json({
      error: `Invalid channel "${channel}". Supported channels are "email", "sms", and "whatsapp".`,
    });
    return;
  }

  if (!recipient.name || (channel === "email" && !recipient.email)) {
    res.status(400).json({
      error: "Invalid recipient details.",
    });
    return;
  }

  // Use the callbackUrl passed in the payload, fallback to the config value
  const targetCallbackUrl = callbackUrl || env.CRM_WEBHOOK_URL;

  // Start the async simulation (non-blocking)
  simulateMessage(req.body, targetCallbackUrl);

  // Return 202 Accepted immediately
  res.status(202).json({
    status: "Accepted",
    message: "Message accepted for delivery simulation",
    communicationId,
  });
};

export const handleHealth = (req: Request, res: Response): void => {
  res.status(200).json({
    status: "OK",
    service: "channel-service",
    timestamp: new Date().toISOString(),
  });
};
