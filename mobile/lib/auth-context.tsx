import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  getStoredUser,
  getToken,
  saveSession,
  type AuthUser,
} from './auth-store';
import * as api from './api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.fetchMe();
      setUser(me.user);
      await saveSession(token, me.user);
    } catch {
      await clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored) setUser(stored);
      await refresh();
    })();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.signIn(email, password);
    await saveSession(res.token, res.user);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const res = await api.signUp(email, password, name);
    await saveSession(res.token, res.user);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
