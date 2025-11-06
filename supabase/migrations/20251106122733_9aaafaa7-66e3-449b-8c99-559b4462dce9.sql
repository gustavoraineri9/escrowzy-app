-- Adicionar colunas para política de disconnect na tabela tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS disconnect_action text DEFAULT 'end' CHECK (disconnect_action IN ('end', 'restart', 'restart_then_end')),
ADD COLUMN IF NOT EXISTS disconnect_max_restarts integer CHECK (disconnect_max_restarts >= 1 AND disconnect_max_restarts <= 3);