import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, mapSupabaseUser } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading } = useAuth();

  useEffect(() => {
    let mounted = true;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        login(mapSupabaseUser(session.user));
      }
      if (mounted) setLoading(false);
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        login(mapSupabaseUser(session.user));
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        logout();
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        login(mapSupabaseUser(session.user));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [login, logout, setLoading]);

  return <>{children}</>;
}
