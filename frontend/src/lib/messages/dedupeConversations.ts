import type { Conversation } from "./messagesTypes";

/** One sidebar row per listing + peer (matches backend thread dedupe) */
export function dedupeConversations(conversations: Conversation[]): Conversation[] {
  const byKey = new Map<string, Conversation>();

  for (const conversation of conversations) {
    const key = `${conversation.listingId}:${conversation.peerName.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, conversation);
      continue;
    }

    const existingTime = existing.lastMessageAt ?? "";
    const nextTime = conversation.lastMessageAt ?? "";
    const pick = nextTime.localeCompare(existingTime) > 0 ? conversation : existing;
    const other = pick === conversation ? existing : conversation;

    byKey.set(key, {
      ...other,
      ...pick,
      unreadCount: (existing.unreadCount ?? 0) + (conversation.unreadCount ?? 0),
      lastMessagePreview: pick.lastMessagePreview || other.lastMessagePreview,
      lastMessageAt: pick.lastMessageAt ?? other.lastMessageAt,
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
  );
}
