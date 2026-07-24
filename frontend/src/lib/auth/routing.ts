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

/** Safe in-app path from ?returnTo= (blocks open redirects). */
export function safeReturnTo(returnTo: string | null | undefined, fallback: string): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallback;
  }
  return returnTo;
}

export function authRedirectPath(user: StoredUser, returnTo?: string | null): string {
  return safeReturnTo(returnTo, postAuthRedirect(user));
}
