export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice?: number;
  listingCurrency?: string;
  listingCity?: string;
  listingAddress?: string;
  listingImageUrl?: string;
  peerName: string;
  peerAvatarUrl?: string;
  peerVerified?: boolean;
  lastMessagePreview: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt?: string;
  /** True when the recipient has read this message (own messages only) */
  isRead?: boolean;
};

export type ListingContext = {
  id: string;
  title: string;
  price: number;
  currency: string;
  city?: string;
  address?: string;
  imageUrl?: string;
};

export type PeerContext = {
  name: string;
  avatarUrl?: string;
  verified: boolean;
};
