import type { StoredUser } from "@/lib/auth/session";

export function isSellerAccount(user: StoredUser | null | undefined): boolean {
  return user?.role === "seller" || Boolean(user?.intends_seller);
}

export function postAuthRedirect(user: StoredUser): string {
  return isSellerAccount(user) ? "/seller" : "/listings";
}

export function buyerBrowsePath(): string {
  return "/listings";
}

export function sellerDashboardPath(): string {
  return "/seller";
}
