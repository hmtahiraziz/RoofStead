import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserAuth } from "../middleware/auth";
import {
  createConversation,
  createMessage,
  findConversationById,
  findConversationForListingAndParticipants,
  findConversationsForListingAsSeller,
  findListingById,
  findUserById,
  listConversationsForUser,
  listMessagesForConversation,
  updateConversation,
} from "../lib/airtable/repositories";

export const messagesRouter = Router();

messagesRouter.use(requireUserAuth);

messagesRouter.get("/conversations", async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const rows = await listConversationsForUser(userId);
    const conversations = await Promise.all(
      rows.map(async (c) => {
        const listing = await findListingById(c.listing_id);
        const peerId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
        const peer = await findUserById(peerId);
        return {
          id: c.id,
          listingId: c.listing_id,
          listingTitle: listing?.title ?? "Listing",
          listingPrice: listing?.price,
          listingCurrency: listing?.currency ?? "USD",
          listingCity: listing?.city,
          listingAddress: listing?.address,
          listingImageUrl: listing?.image_urls?.[0],
          peerName: peer?.name ?? "User",
          peerAvatarUrl: peer?.profile_picture_url,
          peerVerified: peer?.verification_status === "verified",
          lastMessagePreview: c.last_message_preview ?? "",
          lastMessageAt: c.last_message_at,
        };
      }),
    );
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

messagesRouter.get("/conversations/:id", async (req: AuthedRequest, res) => {
  try {
    const conversation = await findConversationById(String(req.params.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const userId = req.userId!;
    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const listing = await findListingById(conversation.listing_id);
    const peerId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
    const peer = await findUserById(peerId);
    const messages = await listMessagesForConversation(conversation.id);
    res.json({
      conversation: {
        id: conversation.id,
        listingId: conversation.listing_id,
        buyerId: conversation.buyer_id,
        sellerId: conversation.seller_id,
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
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        body: m.body,
        createdAt: m.created_at,
        isMine: m.sender_id === userId,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load messages" });
  }
});

const sendSchema = z.object({
  body: z.string().min(1).max(4000),
});

messagesRouter.post("/conversations/:id", async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }

  const conversation = await findConversationById(String(req.params.id));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const userId = req.userId!;
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const now = new Date().toISOString();
    const message = await createMessage({
      conversation: [conversation.id],
      sender: [userId],
      body: parsed.data.body.trim(),
      created_at: now,
    });
    await updateConversation(conversation.id, {
      last_message_at: now,
      last_message_preview: parsed.data.body.trim().slice(0, 120),
    });
    res.status(201).json({
      message: {
        id: message.id,
        senderId: message.sender_id,
        body: message.body,
        createdAt: message.created_at,
        isMine: true,
      },
    });
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
      await createMessage({
        conversation: [conversation.id],
        sender: [userId],
        body: parsed.data.message.trim(),
        created_at: now,
      });
      await updateConversation(conversation.id, {
        last_message_at: now,
        last_message_preview: parsed.data.message.trim().slice(0, 120),
      });
    }

    res.status(201).json({ conversationId: conversation.id, existing: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start conversation" });
  }
});
