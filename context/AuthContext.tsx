import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
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
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}

function paramsFromUrl(url: string) {
  const fragment = url.split('#')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return params;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recovering, setRecovering] = useState(false);
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

  // Opening the reset link signs the user in just long enough to choose a new password.
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const params = paramsFromUrl(url);
      if (params.type !== 'recovery' || !params.access_token || !params.refresh_token) {
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (!error) {
        setRecovering(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
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

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('reset-password'),
    });
    if (error) {
      throw error;
    }
  };

  // Sets the new password, then signs out so the user logs in with it.
  const setNewPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
    setRecovering(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        showSuccess,
        recovering,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        setNewPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
