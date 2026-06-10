import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  CRM_WEBHOOK_URL:
    process.env.CRM_WEBHOOK_URL || "http://localhost:3000/api/webhooks/receipt",
};
