-- Create transactions table to record Mercado Pago payments and reconciliations
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT,
  preference_id TEXT,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  amount NUMERIC(10,2),
  status TEXT,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure payment_id is unique if provided
CREATE UNIQUE INDEX IF NOT EXISTS transactions_payment_id_idx ON public.transactions(payment_id);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: allow participants to view their own transactions
CREATE POLICY "Participants can view their transactions"
ON public.transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.id = transactions.participant_id
      AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.participants p2 ON p2.tournament_id = t.id
    WHERE p2.id = transactions.participant_id
      AND t.owner_id = auth.uid()
  )
);

-- Note: inserts/updates are intended to be performed by backend using the Supabase
-- service_role key (which bypasses RLS). If you need to allow client inserts,
-- add an appropriate policy (not recommended for production).
