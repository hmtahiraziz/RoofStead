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
};

export type ChatMessage = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt?: string;
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
