import express, { Router } from "express";
import PaymentController from "../controllers/PaymentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// POST /api/payments/create_preference
router.post("/create_preference", authMiddleware, PaymentController.createPreference);

// POST /api/payments/webhook  <- para receber notificações do Mercado Pago
router.post("/webhook", express.json(), PaymentController.webhookHandler as any);

export default router;
