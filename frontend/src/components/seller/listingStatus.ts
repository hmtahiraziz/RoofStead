import type { SellerListingStatus } from "@/lib/types/sellerListing";

export const STATUS_LABELS: Record<SellerListingStatus, string> = {
  active: "Active",
  sold: "Sold",
  rented: "Rented",
  deleted: "Deleted",
};

export const STATUS_STYLES: Record<SellerListingStatus, string> = {
  active: "bg-primary-container text-on-primary-container",
  sold: "bg-tertiary-container text-on-tertiary-container",
  rented: "bg-secondary-container text-on-secondary-container",
  deleted: "bg-error-container text-on-error-container",
};

export function statusActionLabel(
  status: SellerListingStatus,
  listingType: "rent" | "sale",
): string | null {
  if (status === "active") {
    return listingType === "rent" ? "Mark as rented" : "Mark as sold";
  }
  if (status === "sold" || status === "rented") {
    return "Mark as active";
  }
  return null;
}

export function nextStatusFromAction(
  current: SellerListingStatus,
  listingType: "rent" | "sale",
): SellerListingStatus | null {
  if (current === "active") {
    return listingType === "rent" ? "rented" : "sold";
  }
  if (current === "sold" || current === "rented") {
    return "active";
  }
  return null;
}
