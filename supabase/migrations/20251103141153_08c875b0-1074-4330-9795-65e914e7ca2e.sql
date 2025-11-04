-- Criar tabela de amizades
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Habilitar RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para friends
CREATE POLICY "Usuários podem ver suas próprias amizades"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Usuários podem criar solicitações de amizade"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas amizades"
  ON public.friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Usuários podem deletar suas amizades"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Criar tabela de conquistas
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Conquistas são públicas (todos podem ver)
CREATE POLICY "Conquistas são visíveis para todos"
  ON public.achievements FOR SELECT
  USING (true);

-- Criar tabela de conquistas dos usuários
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, achievement_id)
);

-- Habilitar RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_achievements
CREATE POLICY "Usuários podem ver suas próprias conquistas"
  ON public.user_achievements FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = user_achievements.profile_id AND profiles.auth_uid = auth.uid()));

CREATE POLICY "Sistema pode criar conquistas para usuários"
  ON public.user_achievements FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = user_achievements.profile_id AND profiles.auth_uid = auth.uid()));

-- Criar tabela de estatísticas head-to-head
CREATE TABLE IF NOT EXISTS public.head_to_head_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wins_a INTEGER NOT NULL DEFAULT 0,
  wins_b INTEGER NOT NULL DEFAULT 0,
  balance_a NUMERIC NOT NULL DEFAULT 0,
  balance_b NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id)
);

-- Habilitar RLS
ALTER TABLE public.head_to_head_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para head_to_head_stats
CREATE POLICY "Usuários podem ver suas estatísticas"
  ON public.head_to_head_stats FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Criar trigger para atualizar updated_at nas tabelas
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_head_to_head_stats_updated_at
  BEFORE UPDATE ON public.head_to_head_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
