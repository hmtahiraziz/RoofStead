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
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { API_URL, apiFetch } from "@/lib/api/client";
import { formatUnreadBadge } from "@/lib/messages/formatUnreadBadge";

type MessagesRealtimeContextValue = {
  socket: Socket | null;
  connected: boolean;
  unreadCount: number;
  badgeLabel: string | null;
  refreshUnreadCount: () => Promise<void>;
};

const MessagesRealtimeContext = createContext<MessagesRealtimeContextValue | null>(null);

export function MessagesRealtimeProvider({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await apiFetch<{ unreadCount: number }>("/api/messages/unread-count", { token });
      setUnreadCount(data.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, [token]);

  useEffect(() => {
    if (loading) return;

    if (!token) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      setConnected(false);
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();

    const nextSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUnread = (payload: { unreadCount?: number }) => {
      if (typeof payload.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      }
    };

    nextSocket.on("connect", onConnect);
    nextSocket.on("disconnect", onDisconnect);
    nextSocket.on("unread:count", onUnread);

    setSocket(nextSocket);

    return () => {
      nextSocket.off("connect", onConnect);
      nextSocket.off("disconnect", onDisconnect);
      nextSocket.off("unread:count", onUnread);
      nextSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [loading, token, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      socket,
      connected,
      unreadCount,
      badgeLabel: formatUnreadBadge(unreadCount),
      refreshUnreadCount,
    }),
    [socket, connected, unreadCount, refreshUnreadCount],
  );

  return (
    <MessagesRealtimeContext.Provider value={value}>{children}</MessagesRealtimeContext.Provider>
  );
}

export function useMessagesRealtime() {
  const ctx = useContext(MessagesRealtimeContext);
  if (!ctx) {
    throw new Error("useMessagesRealtime must be used within MessagesRealtimeProvider");
  }
  return ctx;
}

/** Safe hook for optional provider usage */
export function useMessagesRealtimeOptional() {
  return useContext(MessagesRealtimeContext);
}
