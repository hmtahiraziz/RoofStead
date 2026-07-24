import type { ListingRecord } from "../airtable/repositories";

function inferPropertyType(listing: ListingRecord): string {
  const haystack = `${listing.title} ${listing.description ?? ""}`.toLowerCase();
  if (haystack.includes("villa") || haystack.includes("villah")) return "Villa";
  if (haystack.includes("mansion") || haystack.includes("estate") || haystack.includes("pavilion")) {
    return "Mansion";
  }
  if (haystack.includes("penthouse") || haystack.includes("loft")) return "Penthouse";
  return "House";
}

export function toPublicListing(listing: ListingRecord, sellerVerified: boolean) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description ?? "",
    city: listing.city,
    address: listing.address ?? "",
    listingType: listing.listing_type,
    price: listing.price,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    area: listing.area,
    areaUnit: listing.area_unit,
    propertyType: inferPropertyType(listing),
    imageUrl: listing.image_urls[0],
    imageUrls: listing.image_urls,
    sellerVerified,
  };
}

export function toSellerListing(listing: ListingRecord) {
  return {
    ...toPublicListing(listing, true),
    status: listing.status,
    sellerId: listing.seller_id,
  };
}

export const SELLER_LISTING_STATUSES = ["active", "sold", "rented", "deleted"] as const;
export type SellerListingStatus = (typeof SELLER_LISTING_STATUSES)[number];
