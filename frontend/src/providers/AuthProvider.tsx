'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage, tokenStore } from '@/lib/api';
import type { AuthResponse, User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  loginWithMock: (email: string) => Promise<AuthResponse>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUserState(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      setUserState(data.user);
    } catch {
      tokenStore.clear();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const finalize = useCallback((data: AuthResponse) => {
    tokenStore.set(data.token);
    setUserState(data.user);
    return data;
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
        return finalize(data);
      } catch (err) {
        throw new Error(apiErrorMessage(err));
      }
    },
    [finalize],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/google', { credential });
        return finalize(data);
      } catch (err) {
        throw new Error(apiErrorMessage(err));
      }
    },
    [finalize],
  );

  const loginWithMock = useCallback(
    async (email: string) => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/google/mock', { email });
        return finalize(data);
      } catch (err) {
        throw new Error(apiErrorMessage(err));
      }
    },
    [finalize],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginWithGoogle,
      loginWithMock,
      logout,
      refresh,
      setUser: setUserState,
    }),
    [user, isLoading, login, loginWithGoogle, loginWithMock, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
