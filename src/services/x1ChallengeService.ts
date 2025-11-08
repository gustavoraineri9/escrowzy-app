import { supabase } from "@/integrations/supabase/client";

export interface X1Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  game: string;
  bet_amount: number;
  status: string;
  created_at: string;
}

/**
 * Cria um desafio X1 no banco.
 * Assunção: existe uma tabela `x1_challenges` com colunas compatíveis.
 */
export async function createX1Challenge(
  challengerId: string,
  challengedId: string,
  game: string,
  betAmount: number,
): Promise<X1Challenge | null> {
  const { data, error } = await supabase
    .from("x1_challenges")
    .insert((() => {
      // Construir o payload explicitamente e defensivamente
      const payload: any = {
        challenger_id: challengerId,
        challenged_id: challengedId,
        game,
        bet_amount: betAmount,
        status: "pending",
      };

      // Log para diagnóstico (temporário)
      try {
        // eslint-disable-next-line no-console
        console.info("[x1ChallengeService] inserting payload:", JSON.stringify(payload));
      } catch (e) {
        // ignore
      }

      return payload;
    })())
    .select()
    .single();

  if (error) {
    // Normalize and throw a JS Error with useful info so the caller pode extrair mensagem
    console.error("Erro ao criar X1 challenge:", error);
    const normalized = {
      message: (error as any)?.message || "Erro ao criar desafio",
      details: (error as any)?.details || (error as any)?.hint || null,
      code: (error as any)?.code || null,
    };
    throw new Error(JSON.stringify(normalized));
  }

  return data as X1Challenge;
}
