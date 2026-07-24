import type { UserRecord } from "../airtable/repositories";

export function isSellerUser(user: UserRecord | null | undefined): boolean {
  if (!user) return false;
  return user.role === "seller" || Boolean(user.intends_seller);
}
