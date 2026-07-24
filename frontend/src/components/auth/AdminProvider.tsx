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
  clearAdminSession,
  getAdminRefreshToken,
  getAdminToken,
  getStoredAdmin,
  persistAdminSession,
  type StoredAdmin,
} from "@/lib/auth/session";

type AdminSessionResponse = {
  token: string;
  refreshToken: string;
  admin: StoredAdmin;
};

type AdminContextValue = {
  admin: StoredAdmin | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string, admin: StoredAdmin) => void;
  logout: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<StoredAdmin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: AdminSessionResponse) => {
    persistAdminSession(session.token, session.refreshToken, session.admin);
    setToken(session.token);
    setAdmin(session.admin);
  }, []);

  const refreshFromToken = useCallback(
    async (refreshToken: string) => {
      const session = await apiFetch<AdminSessionResponse>("/api/admin/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      applySession(session);
    },
    [applySession],
  );

  const bootstrap = useCallback(async () => {
    const accessToken = getAdminToken();
    const refreshToken = getAdminRefreshToken();
    const stored = getStoredAdmin();

    if (!accessToken && !refreshToken) {
      setAdmin(null);
      setToken(null);
      return;
    }

    if (stored) setAdmin(stored);
    if (accessToken) setToken(accessToken);

    if (accessToken) {
      try {
        const me = await apiFetch<StoredAdmin>("/api/admin/me", { token: accessToken });
        if (refreshToken) persistAdminSession(accessToken, refreshToken, me);
        setAdmin(me);
        setToken(accessToken);
        return;
      } catch {
        /* try refresh */
      }
    }

    if (refreshToken) {
      await refreshFromToken(refreshToken);
      return;
    }

    clearAdminSession();
    setAdmin(null);
    setToken(null);
  }, [refreshFromToken]);

  useEffect(() => {
    bootstrap()
      .catch(() => {
        clearAdminSession();
        setAdmin(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [bootstrap]);

  const login = useCallback((newToken: string, refreshToken: string, profile: StoredAdmin) => {
    persistAdminSession(newToken, refreshToken, profile);
    setToken(newToken);
    setAdmin(profile);
  }, []);

  const logout = useCallback(async () => {
    const accessToken = getAdminToken();
    try {
      if (accessToken) {
        await apiFetch("/api/admin/logout", { method: "POST", token: accessToken });
      }
    } catch {
      /* ignore */
    } finally {
      clearAdminSession();
      setToken(null);
      setAdmin(null);
    }
  }, []);

  const value = useMemo(
    () => ({ admin, token, loading, login, logout }),
    [admin, token, loading, login, logout],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminProvider");
  return ctx;
}

export function useRedirectIfAdminAuthenticated() {
  const { admin, loading } = useAdminAuth();
  return { admin, loading, redirecting: !loading && Boolean(admin) };
}
