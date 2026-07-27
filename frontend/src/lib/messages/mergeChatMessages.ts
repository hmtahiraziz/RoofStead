import type { ChatMessage } from "./messagesTypes";

/** Keep locally confirmed messages when a poll hasn't caught up yet */
export function mergeChatMessages(server: ChatMessage[], local: ChatMessage[]): ChatMessage[] {
  const merged = new Map<string, ChatMessage>();
  for (const message of server) {
    merged.set(message.id, message);
  }
  for (const message of local) {
    if (!merged.has(message.id)) {
      merged.set(message.id, message);
    }
  }
  return Array.from(merged.values()).sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  );
}
