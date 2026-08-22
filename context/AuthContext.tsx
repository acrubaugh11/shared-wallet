import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

const SUCCESS_DURATION_MS = 1500;

type Profile = {
  id: string;
  display_name: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  showSuccess: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.subscription.unsubscribe();
      if (successTimeout.current) {
        clearTimeout(successTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session?.user.id]);

  // Shows the "logged in" transition screen for a fixed window after an
  // explicit sign-in/sign-up action (not on cold-start session restores).
  const triggerSuccess = () => {
    setShowSuccess(true);
    if (successTimeout.current) {
      clearTimeout(successTimeout.current);
    }
    successTimeout.current = setTimeout(() => setShowSuccess(false), SUCCESS_DURATION_MS);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    triggerSuccess();
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      throw error;
    }
    const needsEmailConfirmation = !data.session;
    if (!needsEmailConfirmation) {
      triggerSuccess();
    }
    return { needsEmailConfirmation };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, isLoading, showSuccess, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
