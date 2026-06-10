import { Router } from "express";
import { handleSend, handleHealth } from "../controllers/send.controller";

const router = Router();

router.post("/send", handleSend);
router.get("/health", handleHealth);

export default router;
