import { Request, Response } from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const MP_PREFERENCES = "https://api.mercadopago.com/checkout/preferences";
const MP_PAYMENTS = "https://api.mercadopago.com/v1/payments";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const createPreference = async (req: Request, res: Response) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado" });

    const { amount, title, external_reference, payer } = req.body as {
      amount: number;
      title: string;
      external_reference?: string;
      payer?: { email?: string };
    };

    if (!amount || !title) return res.status(400).json({ error: "'amount' e 'title' são obrigatórios" });

    // Validação básica com Supabase se tiver participant
    if (external_reference && supabase) {
      const { data: participant, error: pErr } = await supabase
        .from("participants")
        .select("id, tournament_id, status, user_id")
        .eq("id", external_reference)
        .maybeSingle();

      if (pErr) {
        console.error("Erro buscando participant:", pErr);
        return res.status(500).json({ error: "Erro interno" });
      }

      if (!participant) return res.status(400).json({ error: "Participante não encontrado" });
      if (participant.status === "paid") return res.status(400).json({ error: "Pagamento já confirmado" });

      // Verifica ownership via authMiddleware: req.userId
      const requesterUserId = (req as any).userId;
      if (!requesterUserId) return res.status(401).json({ error: "Usuário não autenticado" });
      if (participant.user_id !== requesterUserId) return res.status(403).json({ error: "Permissão negada" });

      // Buscar torneio e validar amount
      const { data: tournament, error: tErr } = await supabase
        .from("tournaments")
        .select("id, entry_fee")
        .eq("id", participant.tournament_id)
        .maybeSingle();

      if (tErr) {
        console.error("Erro buscando torneio:", tErr);
        return res.status(500).json({ error: "Erro interno" });
      }

      if (!tournament) return res.status(400).json({ error: "Torneio não encontrado" });
      const expectedAmount = Number(tournament.entry_fee || 0);
      if (Number(amount) !== expectedAmount) return res.status(400).json({ error: "Valor não confere" });
    }

    // Prevenir criação duplicada: se já existe uma transaction 'created' ou 'pending' para esse participant,
    // retornar a preferência existente (se tivermos preference_id) para evitar criar múltiplas preferências.
    if (external_reference && supabase) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id, preference_id, status")
        .eq("participant_id", external_reference)
        .in("status", ["created", "pending"])
        .maybeSingle();

      if (existing && existing.preference_id) {
        try {
          // Buscar preferência no Mercado Pago para obter init_point
          const prefRes = await axios.get(`${MP_PREFERENCES}/${existing.preference_id}`, {
            headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
          });
          return res.json({
            init_point: prefRes.data.init_point,
            sandbox_init_point: prefRes.data.sandbox_init_point,
            preference_id: existing.preference_id,
            note: "existing_preference",
          });
        } catch (err) {
          // Se não conseguir buscar, retornamos um erro simples pedindo ao usuário tentar novamente
          console.warn("Não foi possível buscar preferência existente:", err?.response?.data || err?.message || err);
          return res.status(409).json({ error: "Já existe um pagamento pendente para este participante" });
        }
      }
    }

    const preferenceBody: any = {
      items: [{ title, quantity: 1, unit_price: Number(amount) }],
      external_reference: external_reference || undefined,
      back_urls: {
        success: process.env.MP_SUCCESS_URL || "http://localhost:8080/payment/success",
        failure: process.env.MP_FAILURE_URL || "http://localhost:8080/payment/failure",
        pending: process.env.MP_PENDING_URL || "http://localhost:8080/payment/pending",
      },
      auto_return: "approved",
    };

    if (payer && payer.email) preferenceBody.payer = { email: payer.email };

    const { data } = await axios.post(MP_PREFERENCES, preferenceBody, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    // Registrar transação criada (status = 'created') para permitir idempotência e reconciliação
    if (supabase) {
      try {
        const txPayload = {
          payment_id: null,
          preference_id: data.id,
          participant_id: external_reference || null,
          amount: Number(amount),
          status: "created",
          raw: data,
          created_at: new Date().toISOString(),
        } as any;
        await supabase.from("transactions").insert(txPayload);
      } catch (txErr) {
        console.warn("Não foi possível registrar transaction criada:", txErr);
      }
    }

    return res.json({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, preference_id: data.id, raw: data });
  } catch (error: any) {
    console.error("Erro criando preferência:", error?.response?.data || error.message || error);
    return res.status(500).json({ error: "Erro ao criar preferência" });
  }
};

export const webhookHandler = async (req: Request, res: Response) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return res.status(500).send("no-token");

    // Optional: verify webhook secret header if configured
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = (req.headers["x-mp-webhook-secret"] || req.headers["x-webhook-secret"] || "") as string;
      if (!headerSecret || headerSecret !== webhookSecret) {
        console.warn("Webhook secret mismatch");
        return res.status(403).send("forbidden");
      }
    }

    const body = req.body || {};
    let paymentId: string | undefined;
    if (body.data && body.data.id) paymentId = String(body.data.id);
    if (!paymentId && body.id) paymentId = String(body.id);

    if (!paymentId) {
      console.warn("Webhook sem payment id", body);
      return res.status(200).send("ok");
    }

    const { data: paymentData } = await axios.get(`${MP_PAYMENTS}/${paymentId}`, { headers: { Authorization: `Bearer ${accessToken}` } });

    let externalReference: string | undefined = paymentData.external_reference || paymentData.order?.external_reference;

    if (!externalReference && paymentData.order?.preference_id) {
      try {
        const prefRes = await axios.get(`${MP_PREFERENCES}/${paymentData.order.preference_id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        externalReference = prefRes.data.external_reference;
      } catch (err) {
        console.warn("Não foi possível buscar preferência", err?.response?.data || err.message || err);
      }
    }

    if (!externalReference) {
      console.warn("External reference não encontrada para payment", paymentId);
      return res.status(200).send("ok");
    }

    const status = (paymentData.status || paymentData.payment_status || paymentData.collection_status || "").toLowerCase();
    if (status === "approved" || status === "paid") {
      if (!supabase) {
        console.warn("Supabase não configurado");
        return res.status(200).send("ok");
      }

      // Idempotência: verificar existing transaction
      const { data: existingTx } = await supabase.from("transactions").select("id, status").eq("payment_id", paymentId).maybeSingle();
      if (existingTx && existingTx.status === "approved") return res.status(200).send("ok");

      const { error: updateErr } = await supabase.from("participants").update({ status: "paid" }).eq("id", externalReference);
      if (updateErr) {
        console.error("Erro atualizando participant:", updateErr);
        return res.status(500).send("error");
      }

      const txPayload = {
        payment_id: paymentId,
        preference_id: paymentData.order?.preference_id || null,
        participant_id: externalReference,
        amount: paymentData.transaction_amount || null,
        status: "approved",
        raw: paymentData,
        created_at: new Date().toISOString(),
      } as any;

      if (existingTx) {
        await supabase.from("transactions").update(txPayload).eq("id", existingTx.id);
      } else {
        await supabase.from("transactions").insert(txPayload);
      }

      console.log(`Participant ${externalReference} marcado como paid (payment ${paymentId})`);
    }

    return res.status(200).send("ok");
  } catch (err: any) {
    console.error("Erro no webhook:", err?.response?.data || err.message || err);
    return res.status(500).send("error");
  }
};

export default { createPreference, webhookHandler };
