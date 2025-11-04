-- Criar tabela friend_requests para solicitações de amizade
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Habilitar RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para friend_requests
CREATE POLICY "Usuários podem ver suas solicitações"
ON public.friend_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Usuários podem criar solicitações"
ON public.friend_requests
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Usuários podem atualizar suas solicitações"
ON public.friend_requests
FOR UPDATE
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Usuários podem deletar suas solicitações"
ON public.friend_requests
FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Adicionar colunas win_streak em head_to_head_stats
ALTER TABLE public.head_to_head_stats 
ADD COLUMN IF NOT EXISTS win_streak_a INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS win_streak_b INTEGER NOT NULL DEFAULT 0;

-- Criar tabela audit_logs para registrar eventos importantes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_logs (apenas leitura para admins/owners)
CREATE POLICY "Tournament owners can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = audit_logs.resource_id
    AND owner_id = auth.uid()
  )
);

-- Criar tabela invites para gerenciar convites de campeonato
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, receiver_id)
);

-- Habilitar RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para invites
CREATE POLICY "Usuários podem ver convites recebidos"
ON public.invites
FOR SELECT
USING (auth.uid() = receiver_id OR auth.uid() = sender_id OR is_tournament_owner(tournament_id, auth.uid()));

CREATE POLICY "Tournament owners podem criar convites"
ON public.invites
FOR INSERT
WITH CHECK (is_tournament_owner(tournament_id, auth.uid()));

CREATE POLICY "Receivers podem atualizar convites"
ON public.invites
FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Senders e owners podem deletar convites"
ON public.invites
FOR DELETE
USING (auth.uid() = sender_id OR is_tournament_owner(tournament_id, auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invites_updated_at
BEFORE UPDATE ON public.invites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();