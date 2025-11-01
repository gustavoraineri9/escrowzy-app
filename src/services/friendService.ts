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

  if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found"
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
    saldo_a: isUsuarioA ? data.balance_a : data.balance_b,
    // Saldo do amigo (Ele) - o saldo do amigo é o oposto do seu
    saldo_b: isUsuarioA ? data.balance_b : data.balance_a,
    // Sequência de vitórias do usuário solicitante (VC)
    sequencia_vitorias_a: isUsuarioA ? data.win_streak_a : data.win_streak_b,
    // Sequência de vitórias do amigo (Ele)
    sequencia_vitorias_b: isUsuarioA ? data.win_streak_b : data.win_streak_a,
    atualizado_em: data.updated_at,
  } as EstatisticasConfrontoDireto;
}

export async function buscarAmigos(idUsuario: string): Promise<Amigo[]> {
  const { data, error } = await supabase
    .from("friends")
    .select(`
      id,
      user_id,
      friend_id,
      created_at,
      perfis:friend_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("user_id", idUsuario);

  if (error) {
    console.error("Erro ao buscar amigos:", error);
    return [];
  }
  return data as Amigo[];
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
      perfil_remetente:sender_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      ),
      perfil_destinatario:receiver_id(
        id,
        auth_uid,
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
      perfil_remetente:sender_id(
        id,
        auth_uid,
        email,
        full_name,
        display_name,
        avatar_url
      ),
      perfil_destinatario:receiver_id(
        id,
        auth_uid,
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

  return [...(solicitacoesEnviadas as SolicitacaoAmizade[]), ...(solicitacoesRecebidas as SolicitacaoAmizade[])];
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
  return data as SolicitacaoAmizade;
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

// Compatibilidade: exportações em inglês usadas por outras partes do app
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

export async function getHeadToHeadStats(idUsuario: string, idAmigo: string): Promise<HeadToHeadStats | null> {
  const dados = await buscarEstatisticasConfrontoDireto(idUsuario, idAmigo);
  if (!dados) return null;

  return {
    user_a_id: dados.id_usuario_a,
    user_b_id: dados.id_usuario_b,
    wins_a: dados.vitorias_a,
    wins_b: dados.vitorias_b,
    balance_a: dados.saldo_a,
    balance_b: dados.saldo_b,
    win_streak_a: dados.sequencia_vitorias_a,
    win_streak_b: dados.sequencia_vitorias_b,
    updated_at: dados.atualizado_em,
  };
}

