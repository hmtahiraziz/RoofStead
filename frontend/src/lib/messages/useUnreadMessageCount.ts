"use client";

import { useMessagesRealtimeOptional } from "@/lib/messages/MessagesRealtimeProvider";

export { formatUnreadBadge } from "@/lib/messages/formatUnreadBadge";

export function useUnreadMessageCount() {
  const ctx = useMessagesRealtimeOptional();
  if (ctx) {
    return {
      unreadCount: ctx.unreadCount,
      badgeLabel: ctx.badgeLabel,
      refresh: ctx.refreshUnreadCount,
    };
  }

  return { unreadCount: 0, badgeLabel: null, refresh: async () => {} };
}
