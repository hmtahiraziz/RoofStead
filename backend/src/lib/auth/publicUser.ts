import type { UserRecord } from "../airtable/repositories";

export function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profile_picture_url: user.profile_picture_url,
    verification_status: user.verification_status,
    intends_seller: user.intends_seller,
  };
}
