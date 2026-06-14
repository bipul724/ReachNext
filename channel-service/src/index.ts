import express from "express";
import cors from "cors";
import { env } from "./config/env";
import sendRoutes from "./routes/send.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api", sendRoutes);

app.listen(env.PORT, () => {
  console.log(`🚀 Channel Service listening on port ${env.PORT}`);
  console.log(`🔗 Webhook callbacks target: ${env.CRM_WEBHOOK_URL}`);
});
