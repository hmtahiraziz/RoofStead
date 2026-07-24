import type { ListingType } from "@/lib/types/listing";

export type SellerListingStatus = "active" | "sold" | "rented" | "deleted";

export type SellerListing = {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  listingType: ListingType;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  areaUnit: string;
  propertyType?: string;
  imageUrl?: string;
  imageUrls?: string[];
  sellerVerified: boolean;
  status: SellerListingStatus;
  sellerId: string;
};
