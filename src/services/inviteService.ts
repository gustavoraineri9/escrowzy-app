import { supabase } from "@/integrations/supabase/client";

export interface Invite {
  id: string;
  tournament_id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  receiver_profile?: {
    id: string;
    display_name: string;
    full_name: string;
    avatar_url?: string;
  };
}

export async function sendTournamentInvites(
  tournamentId: string,
  senderId: string,
  receiverIds: string[]
): Promise<void> {
  const invites = receiverIds.map((receiverId) => ({
    tournament_id: tournamentId,
    sender_id: senderId,
    receiver_id: receiverId,
    status: "pending" as const,
  }));

  const { error } = await supabase.from("invites").insert(invites);

  if (error) {
    console.error("Erro ao enviar convites:", error);
    throw error;
  }
}

export async function getTournamentInvites(tournamentId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select(`
      id,
      tournament_id,
      sender_id,
      receiver_id,
      status,
      created_at,
      updated_at,
      receiver_profile:receiver_id(
        id,
        display_name,
        full_name,
        avatar_url
      )
    `)
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("Erro ao buscar convites:", error);
    return [];
  }

  return data as unknown as Invite[];
}

export async function acceptTournamentInvite(inviteId: string): Promise<void> {
  // Buscar informações do convite
  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("tournament_id, receiver_id")
    .eq("id", inviteId)
    .single();

  if (inviteError) {
    console.error("Erro ao buscar convite:", inviteError);
    throw inviteError;
  }

  // Atualizar status do convite para "accepted"
  const { error: updateError } = await supabase
    .from("invites")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (updateError) {
    console.error("Erro ao aceitar convite:", updateError);
    throw updateError;
  }

  // Adicionar usuário como participante do campeonato
  const { error: participantError } = await supabase
    .from("participants")
    .insert({
      tournament_id: invite.tournament_id,
      user_id: invite.receiver_id,
      status: "pending",
    });

  if (participantError) {
    console.error("Erro ao adicionar participante:", participantError);
    throw participantError;
  }
}

export async function rejectTournamentInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("invites")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    console.error("Erro ao recusar convite:", error);
    throw error;
  }
}

export async function getUserPendingInvites(userId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select(`
      id,
      tournament_id,
      sender_id,
      receiver_id,
      status,
      created_at,
      updated_at
    `)
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) {
    console.error("Erro ao buscar convites pendentes:", error);
    return [];
  }

  return data as Invite[];
}
