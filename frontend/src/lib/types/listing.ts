import type { CurrencyCode } from "@/lib/constants/currencies";
import type { AreaUnit } from "@/lib/constants/areas";

export type ListingType = "rent" | "sale";

export type ListingSummary = {
  id: string;
  title: string;
  city: string;
  listingType: ListingType;
  price: number;
  currency: CurrencyCode;
  bedrooms: number;
  bathrooms: number;
  area: number;
  areaUnit: AreaUnit;
  imageUrl?: string;
  sellerVerified: boolean;
};
