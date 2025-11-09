import express, { Router } from "express";
import PaymentController from "../controllers/PaymentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/create_preference", authMiddleware, PaymentController.createPreference);
router.post("/webhook", express.json(), PaymentController.webhookHandler as any);

export default router;
