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
  getUserRefreshToken,
  getUserToken,
  persistUserSession,
  type StoredUser,
} from "@/lib/auth/session";

type AuthSessionResponse = {
  token: string;
  refreshToken: string;
  user: StoredUser;
};

type AuthContextValue = {
  user: StoredUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string, user: StoredUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyProfile: (user: StoredUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mergeStoredProfile(apiUser: StoredUser, stored: StoredUser | null): StoredUser {
  return {
    ...apiUser,
    profile_picture_url: apiUser.profile_picture_url ?? stored?.profile_picture_url,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: AuthSessionResponse) => {
    const stored = getStoredUser();
    const merged = mergeStoredProfile(session.user, stored);
    persistUserSession(session.token, session.refreshToken, merged);
    setToken(session.token);
    setUser(merged);
  }, []);

  const refreshFromToken = useCallback(
    async (refreshToken: string) => {
      const session = await apiFetch<AuthSessionResponse>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      applySession(session);
    },
    [applySession],
  );

  const refreshUser = useCallback(async () => {
    const accessToken = getUserToken();
    const refreshToken = getUserRefreshToken();

    if (!accessToken && !refreshToken) {
      setUser(null);
      setToken(null);
      return;
    }

    if (accessToken) {
      try {
        const me = await apiFetch<StoredUser>("/api/auth/me", { token: accessToken });
        const stored = getStoredUser();
        const merged = mergeStoredProfile(me, stored);
        if (refreshToken) {
          persistUserSession(accessToken, refreshToken, merged);
        }
        setUser(merged);
        setToken(accessToken);
        return;
      } catch {
        /* fall through to refresh token */
      }
    }

    if (refreshToken) {
      await refreshFromToken(refreshToken);
      return;
    }

    clearUserSession();
    setUser(null);
    setToken(null);
  }, [refreshFromToken]);

  useEffect(() => {
    const accessToken = getUserToken();
    const refreshToken = getUserRefreshToken();
    const stored = getStoredUser();

    if (!accessToken && !refreshToken) {
      setLoading(false);
      return;
    }

    if (stored) {
      setUser(stored);
    }
    if (accessToken) {
      setToken(accessToken);
    }

    refreshUser()
      .catch(() => {
        clearUserSession();
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    (newToken: string, refreshToken: string, profile: StoredUser) => {
      persistUserSession(newToken, refreshToken, profile);
      setToken(newToken);
      setUser(profile);
    },
    [],
  );

  const logout = useCallback(async () => {
    const accessToken = getUserToken();
    try {
      if (accessToken) {
        await apiFetch("/api/auth/logout", { method: "POST", token: accessToken });
      }
    } catch {
      /* clear local session even if server logout fails */
    } finally {
      clearUserSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  const applyProfile = useCallback((profile: StoredUser) => {
    const accessToken = getUserToken();
    const refreshToken = getUserRefreshToken();
    if (accessToken && refreshToken) {
      persistUserSession(accessToken, refreshToken, profile);
    }
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
