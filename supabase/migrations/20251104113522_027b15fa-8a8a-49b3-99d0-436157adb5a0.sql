-- Adicionar foreign keys para friend_requests
ALTER TABLE public.friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_sender_id_fkey,
  DROP CONSTRAINT IF EXISTS friend_requests_receiver_id_fkey;

ALTER TABLE public.friend_requests
  ADD CONSTRAINT friend_requests_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT friend_requests_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Adicionar foreign keys para friends (se ainda não existir)
ALTER TABLE public.friends
  DROP CONSTRAINT IF EXISTS friends_user_id_fkey,
  DROP CONSTRAINT IF EXISTS friends_friend_id_fkey;

ALTER TABLE public.friends
  ADD CONSTRAINT friends_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT friends_friend_id_fkey 
    FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;