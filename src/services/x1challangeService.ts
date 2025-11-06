import { supabase } from "../integrations/supabase/client";
import {
  X1Challenge,
  CreateX1ChallengeData,
  UpdateX1ChallengeData,
} from "../integrations/supabase/types.ts";

const TABLE_NAME = "x1_challenges";

/**
 * Serviço para interagir com a tabela x1_challenges no Supabase.
 */
export const x1ChallengeService = {
  /**
   * Cria um novo desafio X1.
   * @param data Dados para a criação do desafio.
   * @returns O desafio X1 criado.
   */
  async createChallenge(data: CreateX1ChallengeData): Promise<X1Challenge> {
    const { data: challenge, error } = await supabase
      .from(TABLE_NAME)
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar desafio X1:", error);
      throw new Error("Não foi possível criar o desafio X1.");
    }

    return challenge as X1Challenge;
  },

  /**
   * Busca um desafio X1 pelo ID.
   * @param id ID do desafio.
   * @returns O desafio X1 ou null se não encontrado.
   */
  async getChallengeById(id: string): Promise<X1Challenge | null> {
    const { data: challenge, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 é o código para "nenhuma linha encontrada"
      console.error("Erro ao buscar desafio X1:", error);
      throw new Error("Não foi possível buscar o desafio X1.");
    }

    return challenge as X1Challenge | null;
  },

  /**
   * Atualiza o status ou o vencedor de um desafio X1.
   * @param id ID do desafio a ser atualizado.
   * @param data Dados para atualização.
   * @returns O desafio X1 atualizado.
   */
  async updateChallenge(
    id: string,
    data: UpdateX1ChallengeData
  ): Promise<X1Challenge> {
    const { data: challenge, error } = await supabase
      .from(TABLE_NAME)
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar desafio X1:", error);
      throw new Error("Não foi possível atualizar o desafio X1.");
    }

    return challenge as X1Challenge;
  },

  /**
   * Busca todos os desafios X1 de um usuário (como desafiante ou desafiado).
   * @param userId ID do usuário.
   * @returns Lista de desafios X1.
   */
  async getUserChallenges(userId: string): Promise<X1Challenge[]> {
    const { data: challenges, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar desafios do usuário:", error);
      throw new Error("Não foi possível buscar os desafios do usuário.");
    }

    return challenges as X1Challenge[];
  },
};
