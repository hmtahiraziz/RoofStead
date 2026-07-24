export const SALE_PRICE_MAX = 100_000_000;
export const RENT_PRICE_MAX = 50_000;

export function maxPriceForListingType(listingType: "rent" | "sale"): number {
  return listingType === "rent" ? RENT_PRICE_MAX : SALE_PRICE_MAX;
}

export function isPriceWithinRange(price: number, listingType: "rent" | "sale"): boolean {
  return price > 0 && price <= maxPriceForListingType(listingType);
}

export function priceRangeError(listingType: "rent" | "sale"): string {
  return listingType === "rent"
    ? `Monthly rent cannot exceed $${RENT_PRICE_MAX.toLocaleString()}`
    : `Asking price cannot exceed $${SALE_PRICE_MAX.toLocaleString()}`;
}
