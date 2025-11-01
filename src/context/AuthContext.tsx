import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Minimal frontend replacement for a backend AuthContext import.
 * Provides a simple `useAuth` hook returning the current Supabase user (or null).
 * This is intentionally lightweight to avoid forcing a provider wrapper across the app.
 */
export const useAuth = () => {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    // initial fetch (supabase v2 returns a Promise)
    supabase.auth.getUser().then((res) => {
      if (!mounted) return;
      setUser(res.data?.user ?? null);
    }).catch((err) => {
      console.error("useAuth: failed to get user", err);
    });

    // subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser((session as any)?.user ?? null);
    });

    return () => {
      mounted = false;
      // unsubscribe if available
      try {
        // supabase v2: listener.subscription.unsubscribe()
        // older: listener.unsubscribe()
        if ((listener as any)?.subscription?.unsubscribe) {
          (listener as any).subscription.unsubscribe();
        } else if ((listener as any)?.unsubscribe) {
          (listener as any).unsubscribe();
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return { user };
};

export default useAuth;
