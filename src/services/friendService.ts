import { supabase } from "@/integrations/supabase/client";

export interface Amigo {
  id: string;
  id_usuario: string;
  id_amigo: string;
  criado_em: string;
  perfis: {
    id: string;
    auth_uid: string;
    email: string;
    nome_completo: string;
    nome_exibicao: string;
    url_avatar?: string;
  } | null;
}

export interface SolicitacaoAmizade {
  id: string;
  id_remetente: string;
  id_destinatario: string;
  status: 'pendente' | 'aceita' | 'recusada';
  criado_em: string;
  atualizado_em: string;
  perfil_remetente: {
    id: string;
    auth_uid: string;
    email: string;
    nome_completo: string;
    nome_exibicao: string;
    url_avatar?: string;
  } | null;
  perfil_destinatario: {
    id: string;
    auth_uid: string;
    email: string;
    nome_completo: string;
    nome_exibicao: string;
    url_avatar?: string;
  } | null;
}

export interface EstatisticasConfrontoDireto {
  id_usuario_a: string;
  id_usuario_b: string;
  vitorias_a: number;
  vitorias_b: number;
  saldo_a: number;
  saldo_b: number;
  sequencia_vitorias_a: number;
  sequencia_vitorias_b: number;
  atualizado_em: string;
}

export async function buscarEstatisticasConfrontoDireto(idUsuario: string, idAmigo: string): Promise<EstatisticasConfrontoDireto | null> {
  // Garante que a ordem dos IDs seja sempre a mesma (ID menor primeiro)
  const usuarioA = idUsuario < idAmigo ? idUsuario : idAmigo;
  const usuarioB = idUsuario < idAmigo ? idAmigo : idUsuario;

  const { data, error } = await supabase
    .from("head_to_head_stats")
    .select("*")
    .eq("user_a_id", usuarioA)
    .eq("user_b_id", usuarioB)
    .single();

  if (error && (error as any).code !== 'PGRST116') { // PGRST116 é "No rows found" no PostgREST
    console.error("Erro ao buscar estatísticas de Confronto Direto:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Mapeia os resultados para o usuário solicitante (idUsuario)
  const isUsuarioA = idUsuario === usuarioA;
  
  // Retorna as estatísticas no contexto do usuário solicitante (VC vs Ele)
  return {
    id_usuario_a: data.user_a_id,
    id_usuario_b: data.user_b_id,
    // Vitórias do usuário solicitante (VC)
    vitorias_a: isUsuarioA ? data.wins_a : data.wins_b,
    // Vitórias do amigo (Ele)
    vitorias_b: isUsuarioA ? data.wins_b : data.wins_a,
    // Saldo do usuário solicitante (VC)
    saldo_a: isUsuarioA ? Number(data.balance_a) : Number(data.balance_b),
    // Saldo do amigo (Ele)
    saldo_b: isUsuarioA ? Number(data.balance_b) : Number(data.balance_a),
    // Sequência de vitórias do usuário solicitante (VC)
    sequencia_vitorias_a: isUsuarioA ? data.win_streak_a : data.win_streak_b,
    // Sequência de vitórias do amigo (Ele)
    sequencia_vitorias_b: isUsuarioA ? data.win_streak_b : data.win_streak_a,
    atualizado_em: data.updated_at,
  } as EstatisticasConfrontoDireto;
}

export async function buscarAmigos(idUsuario: string): Promise<Amigo[]> {
  // Busca amizades onde o usuário é user_id ou friend_id (aceitas)
  const { data, error } = await supabase
    .from("friends")
    .select(`
      id,
      user_id,
      friend_id,
      status,
      created_at,
      profiles_user:profiles!user_id(id, email, full_name, display_name, avatar_url),
      profiles_friend:profiles!friend_id(id, email, full_name, display_name, avatar_url)
    `)
    .eq("status", "accepted")
    .or(`user_id.eq.${idUsuario},friend_id.eq.${idUsuario}`);

  if (error) {
    console.error("Erro ao buscar amigos:", error);
    return [];
  }

  return (data || []).map((item: any) => {
    // Determina qual perfil é o amigo (o que não é o usuário atual)
    const friendProfile = item.user_id === idUsuario ? item.profiles_friend : item.profiles_user;

    return {
      id: item.id,
      id_usuario: item.user_id,
      id_amigo: item.friend_id,
      criado_em: item.created_at,
      perfis: friendProfile ? {
        id: friendProfile.id,
        auth_uid: friendProfile.id,
        email: friendProfile.email,
        nome_completo: friendProfile.full_name,
        nome_exibicao: friendProfile.display_name,
        url_avatar: friendProfile.avatar_url
      } : null
    } as Amigo;
  });
}

export async function buscarSolicitacoesPendentes(idUsuario: string): Promise<SolicitacaoAmizade[]> {
  const { data: solicitacoesEnviadas, error: erroEnviadas } = await supabase
    .from("friend_requests")
    .select(`
      id,
      sender_id,
      receiver_id,
      status,
      created_at,
      updated_at,
      sender_profile:profiles!friend_requests_sender_id_fkey(
        id,
        email,
        full_name,
        display_name,
        avatar_url
      ),
      receiver_profile:profiles!friend_requests_receiver_id_fkey(
        id,
        email,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("sender_id", idUsuario)
    .eq("status", "pending");

  if (erroEnviadas) {
    console.error("Erro ao buscar solicitações de amizade enviadas:", erroEnviadas);
    return [];
  }

  const { data: solicitacoesRecebidas, error: erroRecebidas } = await supabase
    .from("friend_requests")
    .select(`
      id,
      sender_id,
      receiver_id,
      status,
      created_at,
      updated_at,
      sender_profile:profiles!friend_requests_sender_id_fkey(
        id,
        email,
        full_name,
        display_name,
        avatar_url
      ),
      receiver_profile:profiles!friend_requests_receiver_id_fkey(
        id,
        email,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("receiver_id", idUsuario)
    .eq("status", "pending");

  if (erroRecebidas) {
    console.error("Erro ao buscar solicitações de amizade recebidas:", erroRecebidas);
    return [];
  }

  const mapToSolicitacao = (item: any): SolicitacaoAmizade => ({
    id: item.id,
    id_remetente: item.sender_id,
    id_destinatario: item.receiver_id,
    status: item.status,
    criado_em: item.created_at,
    atualizado_em: item.updated_at,
    perfil_remetente: item.sender_profile ? {
      id: item.sender_profile.id,
      auth_uid: item.sender_profile.id,
      email: item.sender_profile.email,
      nome_completo: item.sender_profile.full_name,
      nome_exibicao: item.sender_profile.display_name,
      url_avatar: item.sender_profile.avatar_url
    } : null,
    perfil_destinatario: item.receiver_profile ? {
      id: item.receiver_profile.id,
      auth_uid: item.receiver_profile.id,
      email: item.receiver_profile.email,
      nome_completo: item.receiver_profile.full_name,
      nome_exibicao: item.receiver_profile.display_name,
      url_avatar: item.receiver_profile.avatar_url
    } : null
  });

  return [
    ...(solicitacoesEnviadas || []).map(mapToSolicitacao),
    ...(solicitacoesRecebidas || []).map(mapToSolicitacao)
  ];
}

export async function enviarSolicitacaoAmizade(idRemetente: string, idDestinatario: string): Promise<SolicitacaoAmizade | null> {
  const { data, error } = await supabase
    .from("friend_requests")
    .insert({
      sender_id: idRemetente,
      receiver_id: idDestinatario,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao enviar solicitação de amizade:", error);
    throw error;
  }
  
  return {
    id: data.id,
    id_remetente: data.sender_id,
    id_destinatario: data.receiver_id,
    status: data.status as any,
    criado_em: data.created_at,
    atualizado_em: data.updated_at,
    perfil_remetente: null,
    perfil_destinatario: null
  };
}

export async function aceitarSolicitacaoAmizade(idSolicitacao: string, idRemetente: string, idDestinatario: string): Promise<void> {
  const { error: erroAtualizacao } = await supabase
    .from("friend_requests")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", idSolicitacao);

  if (erroAtualizacao) {
    console.error("Erro ao aceitar solicitação de amizade:", erroAtualizacao);
    throw erroAtualizacao;
  }

  // Adicionar ambos os lados da amizade na tabela 'friends'
  const { error: erroInsercao1 } = await supabase
    .from("friends")
    .insert({ user_id: idRemetente, friend_id: idDestinatario });

  if (erroInsercao1) {
    console.error("Erro ao adicionar amigo (remetente->destinatário):", erroInsercao1);
    throw erroInsercao1;
  }

  const { error: erroInsercao2 } = await supabase
    .from("friends")
    .insert({ user_id: idDestinatario, friend_id: idRemetente });

  if (erroInsercao2) {
    console.error("Erro ao adicionar amigo (destinatário->remetente):", erroInsercao2);
    throw erroInsercao2;
  }
}

export async function recusarSolicitacaoAmizade(idSolicitacao: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", idSolicitacao);

  if (error) {
    console.error("Erro ao recusar solicitação de amizade:", error);
    throw error;
  }
}

export async function removerAmigo(idUsuario: string, idAmigo: string): Promise<void> {
  const { error: erro1 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", idUsuario)
    .eq("friend_id", idAmigo);

  if (erro1) {
    console.error("Erro ao remover amigo (usuario->amigo):", erro1);
    throw erro1;
  }

  const { error: erro2 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", idAmigo)
    .eq("friend_id", idUsuario);

  if (erro2) {
    console.error("Erro ao remover amigo (amigo->usuario):", erro2);
    throw erro2;
  }
}

export async function buscarUsuarios(consulta: string, idUsuarioAtual: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, avatar_url")
    .ilike("display_name", `%${consulta}%`)
    .neq("id", idUsuarioAtual) // Não mostra o próprio usuário
    .limit(10);

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
  return data;
}

