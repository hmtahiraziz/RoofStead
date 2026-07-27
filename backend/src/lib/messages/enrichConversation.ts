import {
  findListingById,
  findUserById,
  unreadCountForUser,
  type ConversationRecord,
} from "../airtable/repositories";

export async function enrichConversation(c: ConversationRecord, userId: string) {
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
    unreadCount: unreadCountForUser(c, userId),
  };
}
