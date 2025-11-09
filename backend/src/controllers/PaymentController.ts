import { Request, Response } from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const MP_PREFERENCES = "https://api.mercadopago.com/checkout/preferences";
const MP_PAYMENTS = "https://api.mercadopago.com/v1/payments";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * POST /api/payments/create_preference
 * Body: { amount, title, external_reference?, payer?: { email } }
 * - Valida participant/tournament no Supabase (se external_reference for enviado)
 * - Cria preferência no Mercado Pago
 */
export const createPreference = async (req: Request, res: Response) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado" });
    }

    const { amount, title, external_reference, payer } = req.body as {
      amount: number;
      title: string;
      external_reference?: string;
      payer?: { email?: string };
    };

    if (!amount || !title) {
      return res.status(400).json({ error: "Parâmetros 'amount' e 'title' são obrigatórios" });
    }

    // Validação adicional no backend: se for fornecido external_reference (participant id),
    // verificar participant existe e está pendente e buscar entry_fee do torneio.
    // Também valida que o usuário autenticado é o dono do participant.
    if (external_reference) {
      if (!supabase) {
        console.warn("Supabase client não configurado: pulando validação do participant");
      } else {
        // Buscar participant
        const { data: participant, error: pErr } = await supabase
          .from("participants")
          .select("id, tournament_id, status, user_id")
          .eq("id", external_reference)
          .maybeSingle();

        if (pErr) {
          console.error("Erro ao buscar participant:", pErr);
          return res.status(500).json({ error: "Erro interno ao validar participante" });
        }

        if (!participant) {
          return res.status(400).json({ error: "Participante não encontrado" });
        }

        if (participant.status === "paid") {
          return res.status(400).json({ error: "Pagamento já confirmado para este participante" });
        }

        // Verificar se o usuário autenticado é o dono desse participant
        const requesterUserId = (req as any).userId;
        if (!requesterUserId) {
          return res.status(401).json({ error: "Usuário não autenticado" });
        }

        if (participant.user_id !== requesterUserId) {
          return res.status(403).json({ error: "Você não tem permissão para pagar por este participante." });
        }

        // Buscar torneio
        const { data: tournament, error: tErr } = await supabase
          .from("tournaments")
          .select("id, entry_fee")
          .eq("id", participant.tournament_id)
          .maybeSingle();

        if (tErr) {
          console.error("Erro ao buscar torneio:", tErr);
          return res.status(500).json({ error: "Erro interno ao validar torneio" });
        }

        if (!tournament) {
          return res.status(400).json({ error: "Torneio não encontrado" });
        }

        // Validar amount com entry_fee do torneio
        const expectedAmount = Number(tournament.entry_fee || 0);
        if (Number(amount) !== expectedAmount) {
          return res.status(400).json({ error: "Valor do pagamento não confere com taxa do torneio" });
        }
      }
    }

    const preferenceBody: any = {
      items: [
        {
          title,
          quantity: 1,
          unit_price: Number(amount),
        },
      ],
      external_reference: external_reference || undefined,
      back_urls: {
        success: process.env.MP_SUCCESS_URL || "http://localhost:8080/payment/success",
        failure: process.env.MP_FAILURE_URL || "http://localhost:8080/payment/failure",
        pending: process.env.MP_PENDING_URL || "http://localhost:8080/payment/pending",
      },
      auto_return: "approved",
    };

    if (payer && payer.email) {
      preferenceBody.payer = { email: payer.email };
    }

    const { data } = await axios.post(MP_PREFERENCES, preferenceBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return res.json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      preference_id: data.id,
      raw: data,
    });
  } catch (error: any) {
    console.error("Erro criando preferência Mercado Pago:", error?.response?.data || error.message || error);
    return res.status(500).json({ error: "Erro ao criar preferência" });
  }
};

/**
 * POST /api/payments/webhook
 * Recebe notificações do Mercado Pago. Tenta resolver o payment id e marcar participant como paid.
 */
export const webhookHandler = async (req: Request, res: Response) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn("MERCADO_PAGO_ACCESS_TOKEN não configurado");
      return res.status(500).send("no-token");
    }

    // Mercado Pago envia diferentes payloads. Tentamos encontrar um payment id.
    const body = req.body || {};
    let paymentId: string | undefined;

    // Estruturas comuns: { type: 'payment', data: { id: '...' } } ou { id: '...', topic: 'payment' }
    if (body.data && body.data.id) paymentId = String(body.data.id);
    if (!paymentId && body.id) paymentId = String(body.id);
    if (!paymentId && body.payment_id) paymentId = String(body.payment_id);

    if (!paymentId) {
      console.warn("Webhook recebido sem payment id", body);
      return res.status(200).send("ok");
    }

    // Buscar pagamento no Mercado Pago
    const { data: paymentData } = await axios.get(`${MP_PAYMENTS}/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Tentar extrair referência externa (participant id) de várias posições
    let externalReference: string | undefined;
    if (paymentData.external_reference) externalReference = paymentData.external_reference;
    if (!externalReference && paymentData.order && paymentData.order.external_reference) externalReference = paymentData.order.external_reference;
    if (!externalReference && paymentData.order && paymentData.order.preference_id) {
      // buscar preferência para ler external_reference
      try {
        const prefRes = await axios.get(`${MP_PREFERENCES}/${paymentData.order.preference_id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        externalReference = prefRes.data.external_reference || prefRes.data.external_reference;
      } catch (err) {
        console.warn("Não foi possível recuperar preferência para extrair external_reference", err?.response?.data || err.message || err);
      }
    }

    // fallback: verificar items.additional_info
    if (!externalReference && paymentData.additional_info && paymentData.additional_info.items && paymentData.additional_info.items.length) {
      externalReference = paymentData.additional_info.items[0].external_reference;
    }

    if (!externalReference) {
      console.warn("Não foi possível extrair external_reference do pagamento", paymentData);
      return res.status(200).send("ok");
    }

    // Se pagamento aprovado, atualizar participant para 'paid' e registrar transação (idempotente)
    const status = (paymentData.status || paymentData.payment_status || paymentData.collection_status || "").toLowerCase();
    if (status === "approved" || status === "paid") {
      if (!supabase) {
        console.warn("Supabase client não configurado: não será possível atualizar participant status");
        return res.status(200).send("ok");
      }

      // Idempotência: verificar se já existe uma transação para esse payment_id
      const { data: existingTx, error: txErr } = await supabase
        .from("transactions")
        .select("id, payment_id, status")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (txErr) {
        console.error("Erro ao buscar transactions:", txErr);
        // não bloqueia a atualização do participant, mas loga o erro
      }

      if (existingTx && existingTx.status === "approved") {
        console.log(`Transação ${paymentId} já processada anteriormente. Ignorando.`);
        return res.status(200).send("ok");
      }

      // Atualizar participant como paid
      const { error: updateErr } = await supabase
        .from("participants")
        .update({ status: "paid" })
        .eq("id", externalReference);

      if (updateErr) {
        console.error("Erro atualizando participant para paid:", updateErr);
        return res.status(500).send("error");
      }

      // Registrar transação (ou atualizar se já existir)
      const txPayload = {
        payment_id: paymentId,
        preference_id: paymentData.order?.preference_id || null,
        participant_id: externalReference,
        amount: paymentData.transaction_amount || paymentData.installments_amount || null,
        status: "approved",
        raw: JSON.stringify(paymentData),
        created_at: new Date().toISOString(),
      } as any;

      if (existingTx) {
        const { error: updTxErr } = await supabase
          .from("transactions")
          .update({ ...txPayload })
          .eq("id", existingTx.id);
        if (updTxErr) console.error("Erro atualizando transaction existente:", updTxErr);
      } else {
        const { error: insErr } = await supabase.from("transactions").insert(txPayload);
        if (insErr) console.error("Erro inserindo transaction:", insErr);
      }

      console.log(`Participant ${externalReference} marcado como paid via webhook (payment ${paymentId})`);
    }

    return res.status(200).send("ok");
  } catch (err: any) {
    console.error("Erro no webhook Mercado Pago:", err?.response?.data || err.message || err);
    return res.status(500).send("error");
  }
};

export default { createPreference, webhookHandler };
