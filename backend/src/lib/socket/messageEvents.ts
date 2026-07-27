import {
  findConversationById,
  getTotalUnreadCountForUser,
  type ConversationRecord,
} from "../airtable/repositories";
import { enrichConversation } from "../messages/enrichConversation";
import type { serializeMessage } from "../messages/serialize";
import { emitToConversation, emitToUser, getSocketIO } from "./io";

type SerializedMessage = ReturnType<typeof serializeMessage>;

export async function emitNewMessage(
  conversation: ConversationRecord,
  senderId: string,
  message: SerializedMessage,
) {
  if (!getSocketIO()) return;

  const recipientId =
    conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;

  const payload = { conversationId: conversation.id, message };

  emitToConversation(conversation.id, "message:new", payload);
  emitToUser(recipientId, "message:new", payload);
  emitToUser(senderId, "message:new", payload);

  const refreshed = (await findConversationById(conversation.id)) ?? conversation;

  const [recipientConversation, recipientUnread, senderUnread] = await Promise.all([
    enrichConversation(refreshed, recipientId),
    getTotalUnreadCountForUser(recipientId),
    getTotalUnreadCountForUser(senderId),
  ]);

  emitToUser(recipientId, "conversation:upsert", { conversation: recipientConversation });
  emitToUser(recipientId, "unread:count", { unreadCount: recipientUnread });
  emitToUser(senderId, "unread:count", { unreadCount: senderUnread });
}

export async function emitConversationRead(conversation: ConversationRecord, readerId: string) {
  if (!getSocketIO()) return;

  const otherParty =
    conversation.buyer_id === readerId ? conversation.seller_id : conversation.buyer_id;

  const refreshed = (await findConversationById(conversation.id)) ?? conversation;
  const readAt =
    readerId === conversation.buyer_id
      ? refreshed.buyer_last_read_at
      : refreshed.seller_last_read_at;

  emitToUser(otherParty, "messages:read", {
    conversationId: conversation.id,
    readAt: readAt ?? new Date().toISOString(),
  });

  const [readerUnread, otherUnread] = await Promise.all([
    getTotalUnreadCountForUser(readerId),
    getTotalUnreadCountForUser(otherParty),
  ]);

  emitToUser(readerId, "unread:count", { unreadCount: readerUnread });
  emitToUser(otherParty, "unread:count", { unreadCount: otherUnread });
}
