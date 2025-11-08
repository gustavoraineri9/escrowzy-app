import { supabase } from "@/integrations/supabase/client";

export interface X1Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
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
  opponentId: string,
  game: string,
  betAmount: number,
): Promise<X1Challenge | null> {
  const { data, error } = await supabase
    .from("x1_challenges")
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      game,
      bet_amount: betAmount,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar X1 challenge:", error);
    throw error;
  }

  return data as X1Challenge;
}
