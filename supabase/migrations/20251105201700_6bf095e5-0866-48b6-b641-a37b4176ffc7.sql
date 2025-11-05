-- Adicionar coluna tolerance_minutes na tabela tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tolerance_minutes integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tournaments.tolerance_minutes IS 'Tempo de tolerância em minutos para o início do torneio';