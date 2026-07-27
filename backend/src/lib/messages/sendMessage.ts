import {
  createMessage,
  findConversationById,
  incrementUnreadForRecipient,
  resolveCanonicalConversation,
  type ConversationRecord,
  type MessageRecord,
  updateConversation,
} from "../airtable/repositories";
import { serializeMessage } from "./serialize";
import { emitNewMessage } from "../socket/messageEvents";

export async function sendConversationMessage(
  conversation: ConversationRecord,
  senderId: string,
  body: string,
): Promise<{ message: MessageRecord; serialized: ReturnType<typeof serializeMessage> }> {
  const canonical = await resolveCanonicalConversation(conversation);
  const trimmed = body.trim();
  const now = new Date().toISOString();

  const message = await createMessage({
    conversation: [canonical.id],
    sender: [senderId],
    body: trimmed,
    created_at: now,
  });

  await updateConversation(canonical.id, {
    last_message_at: now,
    last_message_preview: trimmed.slice(0, 120),
  });

  try {
    await incrementUnreadForRecipient(canonical.id, senderId);
  } catch (unreadErr) {
    console.warn("[messages] Could not increment unread count:", unreadErr);
  }

  const refreshed = (await findConversationById(canonical.id)) ?? canonical;

  const serialized = serializeMessage(message, refreshed, senderId);
  await emitNewMessage(refreshed, senderId, serialized);

  return {
    message,
    serialized,
  };
}
