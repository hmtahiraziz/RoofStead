import type { ConversationRecord, MessageRecord } from "../airtable/repositories";

export function recipientLastReadAt(
  conversation: ConversationRecord,
  viewerUserId: string,
): string | undefined {
  if (conversation.buyer_id === viewerUserId) return conversation.seller_last_read_at;
  if (conversation.seller_id === viewerUserId) return conversation.buyer_last_read_at;
  return undefined;
}

export function isMessageReadByRecipient(
  message: MessageRecord,
  conversation: ConversationRecord,
  senderUserId: string,
): boolean {
  if (message.sender_id !== senderUserId || !message.created_at) return false;
  const readAt = recipientLastReadAt(conversation, senderUserId);
  if (!readAt) return false;
  return new Date(readAt).getTime() >= new Date(message.created_at).getTime();
}

export function serializeMessage(
  message: MessageRecord,
  conversation: ConversationRecord,
  viewerUserId: string,
) {
  const isMine = message.sender_id === viewerUserId;
  return {
    id: message.id,
    senderId: message.sender_id,
    body: message.body,
    createdAt: message.created_at,
    isMine,
    isRead: isMine ? isMessageReadByRecipient(message, conversation, viewerUserId) : undefined,
  };
}

export function serializeMessages(
  messages: MessageRecord[],
  conversation: ConversationRecord,
  viewerUserId: string,
) {
  return messages.map((m) => serializeMessage(m, conversation, viewerUserId));
}
