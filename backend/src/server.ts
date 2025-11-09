import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import { User } from "./models/User";

dotenv.config();

const app = express();

// 🧱 Middlewares globais
app.use(express.json());

// ✅ Configuração do CORS para permitir comunicação com o front
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    credentials: true,
  })
);

// Health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 🛠️ Rotas principais (autenticação)
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);

// 🚀 Inicialização do servidor
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
  }
});
