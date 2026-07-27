import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserAuth } from "../middleware/auth";
import {
  createConversation,
  findConversationById,
  findConversationForListingAndParticipants,
  findConversationsForListingAsSeller,
  findListingById,
  findUserById,
  getTotalUnreadCountForUser,
  listConversationsForUser,
  listMessagesForConversationThread,
  markConversationRead,
  resolveCanonicalConversation,
} from "../lib/airtable/repositories";
import { enrichConversation } from "../lib/messages/enrichConversation";
import { recipientLastReadAt, serializeMessages } from "../lib/messages/serialize";
import { sendConversationMessage } from "../lib/messages/sendMessage";
import { emitConversationRead } from "../lib/socket/messageEvents";

export const messagesRouter = Router();

messagesRouter.use(requireUserAuth);

async function assertConversationAccess(conversationId: string, userId: string) {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return { error: "Conversation not found", status: 404 as const };
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { conversation, status: 200 as const };
}

async function enrichConversations(userId: string) {
  const rows = await listConversationsForUser(userId);
  return Promise.all(rows.map((c) => enrichConversation(c, userId)));
}

messagesRouter.get("/unread-count", async (req: AuthedRequest, res) => {
  try {
    const total = await getTotalUnreadCountForUser(req.userId!);
    res.json({ unreadCount: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load unread count" });
  }
});

/** Lightweight poll for navbar badge + conversation list updates */
messagesRouter.get("/poll", async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const conversations = await enrichConversations(userId);
    const unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
    res.json({ unreadCount, conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not poll messages" });
  }
});

messagesRouter.get("/conversations", async (req: AuthedRequest, res) => {
  try {
    const conversations = await enrichConversations(req.userId!);
    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load conversations" });
  }
});

messagesRouter.get("/conversations/by-listing/:listingId", async (req: AuthedRequest, res) => {
  try {
    const listing = await findListingById(String(req.params.listingId));
    if (!listing || listing.status !== "active") {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const userId = req.userId!;

    if (listing.seller_id === userId) {
      const conversations = await findConversationsForListingAsSeller(listing.id, userId);
      if (conversations.length === 0) {
        res.status(404).json({ error: "No conversations for this listing yet" });
        return;
      }
      res.json({
        conversationId: conversations[0].id,
        conversationIds: conversations.map((c) => c.id),
        existing: true,
      });
      return;
    }

    const existing = await findConversationForListingAndParticipants(
      listing.id,
      userId,
      listing.seller_id,
    );
    if (!existing) {
      res.status(404).json({ error: "No conversation yet" });
      return;
    }

    res.json({ conversationId: existing.id, existing: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not look up conversation" });
  }
});

/** Poll active thread — marks read when the viewer has the chat open */
messagesRouter.get("/conversations/:id/poll", async (req: AuthedRequest, res) => {
  try {
    const access = await assertConversationAccess(String(req.params.id), req.userId!);
    if ("error" in access) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { conversation } = access;
    const userId = req.userId!;
    const canonical = await resolveCanonicalConversation(conversation);
    const messages = await listMessagesForConversationThread(canonical);

    try {
      await markConversationRead(canonical, userId);
      await emitConversationRead(canonical, userId);
    } catch (readErr) {
      console.warn("[messages] Could not mark conversation read:", readErr);
    }

    const refreshed = (await findConversationById(canonical.id)) ?? canonical;

    res.json({
      messages: serializeMessages(messages, refreshed, userId),
      peerLastReadAt: recipientLastReadAt(refreshed, userId),
      conversationId: canonical.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not poll conversation" });
  }
});

messagesRouter.get("/conversations/:id", async (req: AuthedRequest, res) => {
  try {
    const access = await assertConversationAccess(String(req.params.id), req.userId!);
    if ("error" in access) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { conversation } = access;
    const userId = req.userId!;
    const canonical = await resolveCanonicalConversation(conversation);
    const listing = await findListingById(canonical.listing_id);
    const peerId = canonical.buyer_id === userId ? canonical.seller_id : canonical.buyer_id;
    const peer = await findUserById(peerId);
    const messages = await listMessagesForConversationThread(canonical);

    try {
      await markConversationRead(canonical, userId);
      await emitConversationRead(canonical, userId);
    } catch (readErr) {
      console.warn("[messages] Could not mark conversation read:", readErr);
    }

    const refreshed = (await findConversationById(canonical.id)) ?? canonical;

    res.json({
      conversation: {
        id: canonical.id,
        listingId: canonical.listing_id,
        buyerId: canonical.buyer_id,
        sellerId: canonical.seller_id,
      },
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            currency: listing.currency ?? "USD",
            city: listing.city,
            address: listing.address,
            imageUrl: listing.image_urls?.[0],
          }
        : null,
      peer: peer
        ? {
            name: peer.name,
            avatarUrl: peer.profile_picture_url,
            verified: peer.verification_status === "verified",
          }
        : null,
      messages: serializeMessages(messages, refreshed, userId),
      peerLastReadAt: recipientLastReadAt(refreshed, userId),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load messages" });
  }
});

const sendSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

/** Dedicated send endpoint */
messagesRouter.post("/send", async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }

  const access = await assertConversationAccess(parsed.data.conversationId, req.userId!);
  if ("error" in access) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  try {
    const { serialized } = await sendConversationMessage(
      access.conversation,
      req.userId!,
      parsed.data.body,
    );
    res.status(201).json({ message: serialized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send message" });
  }
});

messagesRouter.post("/conversations/:id", async (req: AuthedRequest, res) => {
  const parsed = z.object({ body: z.string().min(1).max(4000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }

  const access = await assertConversationAccess(String(req.params.id), req.userId!);
  if ("error" in access) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  try {
    const { serialized } = await sendConversationMessage(
      access.conversation,
      req.userId!,
      parsed.data.body,
    );
    res.status(201).json({ message: serialized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send message" });
  }
});

const startSchema = z.object({
  listingId: z.string().min(1),
  message: z.string().min(1).max(4000).optional(),
});

messagesRouter.post("/conversations", async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const listing = await findListingById(parsed.data.listingId);
  if (!listing || listing.status !== "active") {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const userId = req.userId!;

  try {
    if (listing.seller_id === userId) {
      const sellerConversations = await findConversationsForListingAsSeller(listing.id, userId);
      if (sellerConversations.length === 0) {
        res.status(404).json({ error: "No buyer inquiries for this listing yet" });
        return;
      }
      res.json({
        conversationId: sellerConversations[0].id,
        existing: true,
      });
      return;
    }

    const existing = await findConversationForListingAndParticipants(
      listing.id,
      userId,
      listing.seller_id,
    );

    if (existing) {
      res.json({ conversationId: existing.id, existing: true });
      return;
    }

    const now = new Date().toISOString();
    const conversation = await createConversation({
      listing: [listing.id],
      buyer: [userId],
      seller: [listing.seller_id],
      last_message_at: now,
      last_message_preview: "",
    });

    if (parsed.data.message?.trim()) {
      await sendConversationMessage(conversation, userId, parsed.data.message);
    }

    res.status(201).json({ conversationId: conversation.id, existing: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start conversation" });
  }
});
