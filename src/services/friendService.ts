import { supabase } from "@/integrations/supabase/client";

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  profiles: {
    id: string;
    auth_uid: string;
    email: string;
    full_name: string;
    display_name: string;
    avatar_url?: string;
  } | null;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  sender_profile: {
    id: string;
    auth_uid: string;
    email: string;
    full_name: string;
    display_name: string;
    avatar_url?: string;
  } | null;
  receiver_profile: {
    id: string;
    auth_uid: string;
    email: string;
    full_name: string;
    display_name: string;
    avatar_url?: string;
  } | null;
}

export interface HeadToHeadStats {
  user_a_id: string;
  user_b_id: string;
  wins_a: number;
  wins_b: number;
  balance_a: number;
  balance_b: number;
  win_streak_a: number;
  win_streak_b: number;
  updated_at: string;
}

export async function getHeadToHeadStats(userId: string, friendId: string): Promise<HeadToHeadStats | null> {
  // Garante que a ordem dos IDs seja sempre a mesma (ID menor primeiro)
  const userA = userId < friendId ? userId : friendId;
  const userB = userId < friendId ? friendId : userId;

  const { data, error } = await supabase
    .from("head_to_head_stats")
    .select("*")
    .eq("user_a_id", userA)
    .eq("user_b_id", userB)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found"
    console.error("Erro ao buscar estatísticas Head-to-Head:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Mapeia os resultados para o usuário solicitante (userId)
  const isUserA = userId === userA;
  
  // Retorna as estatísticas no contexto do usuário solicitante (VC vs Ele)
  return {
    user_a_id: data.user_a_id,
    user_b_id: data.user_b_id,
    // Vitórias do usuário solicitante (VC)
    wins_a: isUserA ? data.wins_a : data.wins_b,
    // Vitórias do amigo (Ele)
    wins_b: isUserA ? data.wins_b : data.wins_a,
    // Saldo do usuário solicitante (VC)
    balance_a: isUserA ? data.balance_a : data.balance_b,
    // Saldo do amigo (Ele) - o saldo do amigo é o oposto do seu
    balance_b: isUserA ? data.balance_b : data.balance_a,
    // Sequência de vitórias do usuário solicitante (VC)
    win_streak_a: isUserA ? data.win_streak_a : data.win_streak_b,
    // Sequência de vitórias do amigo (Ele)
    win_streak_b: isUserA ? data.win_streak_b : data.win_streak_a,
    updated_at: data.updated_at,
  } as HeadToHeadStats;
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from("friends")
    .select(`
      *,
      profiles:friend_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao buscar amigos:", error);
    return [];
  }
  return data as Friend[];
}

export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const { data: sentRequests, error: sentError } = await supabase
    .from("friend_requests")
    .select(`
      *,
      sender_profile:sender_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      ),
      receiver_profile:receiver_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("sender_id", userId)
    .eq("status", "pending");

  if (sentError) {
    console.error("Erro ao buscar solicitações de amizade enviadas:", sentError);
    return [];
  }

  const { data: receivedRequests, error: receivedError } = await supabase
    .from("friend_requests")
    .select(`
      *,
      sender_profile:sender_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      ),
      receiver_profile:receiver_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (receivedError) {
    console.error("Erro ao buscar solicitações de amizade recebidas:", receivedError);
    return [];
  }

  return [...(sentRequests as FriendRequest[]), ...(receivedRequests as FriendRequest[])];
}

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest | null> {
  const { data, error } = await supabase
    .from("friend_requests")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao enviar solicitação de amizade:", error);
    throw error;
  }
  return data as FriendRequest;
}

export async function acceptFriendRequest(requestId: string, senderId: string, receiverId: string): Promise<void> {
  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateError) {
    console.error("Erro ao aceitar solicitação de amizade:", updateError);
    throw updateError;
  }

  // Adicionar ambos os lados da amizade na tabela 'friends'
  const { error: insert1Error } = await supabase
    .from("friends")
    .insert({ user_id: senderId, friend_id: receiverId });

  if (insert1Error) {
    console.error("Erro ao adicionar amigo (sender->receiver):", insert1Error);
    throw insert1Error;
  }

  const { error: insert2Error } = await supabase
    .from("friends")
    .insert({ user_id: receiverId, friend_id: senderId });

  if (insert2Error) {
    console.error("Erro ao adicionar amigo (receiver->sender):", insert2Error);
    throw insert2Error;
  }
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) {
    console.error("Erro ao recusar solicitação de amizade:", error);
    throw error;
  }
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const { error: error1 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendId);

  if (error1) {
    console.error("Erro ao remover amigo (user->friend):", error1);
    throw error1;
  }

  const { error: error2 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", friendId)
    .eq("friend_id", userId);

  if (error2) {
    console.error("Erro ao remover amigo (friend->user):", error2);
    throw error2;
  }
}

export async function searchUsers(query: string, currentUserId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, avatar_url")
    .ilike("display_name", `%${query}%`)
    .neq("id", currentUserId) // Não mostra o próprio usuário
    .limit(10);

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
  return data;
}
