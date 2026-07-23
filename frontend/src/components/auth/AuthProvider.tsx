"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api/client";
import {
  clearUserSession,
  getStoredUser,
  getUserToken,
  persistUserSession,
  type StoredUser,
} from "@/lib/auth/session";

type AuthContextValue = {
  user: StoredUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: StoredUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  applyProfile: (user: StoredUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const t = getUserToken();
    if (!t) {
      setUser(null);
      setToken(null);
      return;
    }
    try {
      const me = await apiFetch<StoredUser>("/api/auth/me", { token: t });
      const stored = getStoredUser();
      const merged: StoredUser = {
        ...me,
        profile_picture_url: me.profile_picture_url ?? stored?.profile_picture_url,
      };
      persistUserSession(t, merged);
      setUser(merged);
      setToken(t);
    } catch {
      clearUserSession();
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const t = getUserToken();
    const stored = getStoredUser();
    if (t && stored) {
      setToken(t);
      setUser(stored);
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback((newToken: string, profile: StoredUser) => {
    persistUserSession(newToken, profile);
    setToken(newToken);
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearUserSession();
    setToken(null);
    setUser(null);
  }, []);

  const applyProfile = useCallback((profile: StoredUser) => {
    const t = getUserToken();
    if (t) persistUserSession(t, profile);
    setUser(profile);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refreshUser, applyProfile }),
    [user, token, loading, login, logout, refreshUser, applyProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
