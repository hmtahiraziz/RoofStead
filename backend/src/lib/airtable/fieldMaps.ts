import type { FieldSet } from "airtable";

/** Logical API keys → field names in the live Airtable base (see docs/AIRTABLE_SCHEMA.md for ideal snake_case). */
const USER_WRITE_MAP: Record<string, string> = {
  email: "Email",
  password_hash: "Password Hash",
  name: "Name",
  email_verified: "Email Verified",
  verification_status: "Verification Status",
  email_verification_token_hash: "Email Verification Token Hash",
  email_verification_expires_at: "Email Verification Expires At",
  intends_seller: "Intends Seller",
  role: "Role",
  refresh_token_hash: "Refresh Token Hash",
  is_active: "Is Active",
  is_deleted: "Is Deleted",
  profile_picture_url: "Profile Picture URL",
  seller_phone: "Seller Phone",
  seller_id_number: "Seller ID Number",
  seller_legal_name: "Seller Legal Name",
  profilePictureUrl: "Profile Picture URL",
  avatar_url: "Profile Picture URL",
};

const LISTING_WRITE_MAP: Record<string, string> = {
  seller: "Seller",
  title: "Title",
  description: "Description",
  listing_type: "Listing Type",
  price: "Price",
  currency: "Currency",
  address: "Address",
  city: "City",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  area: "Area (sqft)",
  area_unit: "Area Unit",
  image_urls: "Image URLs",
  status: "Status",
  view_count: "View Count",
  inquiry_count: "Inquiry Count",
};

const LISTING_TYPE_TO_AIRTABLE: Record<string, string> = {
  rent: "Rent",
  sale: "Sale",
};

const LISTING_STATUS_TO_AIRTABLE: Record<string, string> = {
  active: "Active",
  rented: "Rented",
  sold: "Sold",
  deleted: "Deleted",
  moderated_hidden: "Moderated Hidden",
};

const VERIFICATION_STATUS_TO_AIRTABLE: Record<string, string> = {
  unverified: "Unverified",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const USER_ROLE_TO_AIRTABLE: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
};

export function userFieldsToAirtable(fields: Record<string, unknown>): FieldSet {
  const out: FieldSet = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const airtableKey = USER_WRITE_MAP[key] ?? key;
    let v = value;
    if (key === "verification_status" && typeof value === "string") {
      v = VERIFICATION_STATUS_TO_AIRTABLE[value.toLowerCase()] ?? value;
    }
    if (key === "role" && typeof value === "string") {
      v = USER_ROLE_TO_AIRTABLE[value.toLowerCase()] ?? value;
    }
    out[airtableKey] = v as FieldSet[string];
  }
  return out;
}

export function listingFieldsToAirtable(fields: Record<string, unknown>): FieldSet {
  const out: FieldSet = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    let v = value;
    if (key === "listing_type" && typeof value === "string") {
      v = LISTING_TYPE_TO_AIRTABLE[value.toLowerCase()] ?? value;
    }
    if (key === "status" && typeof value === "string") {
      v = LISTING_STATUS_TO_AIRTABLE[value.toLowerCase()] ?? value;
    }
    const airtableKey = LISTING_WRITE_MAP[key] ?? key;
    out[airtableKey] = v as FieldSet[string];
  }
  return out;
}

const CONVERSATION_WRITE_MAP: Record<string, string> = {
  listing: "Listing",
  buyer: "Buyer",
  seller: "Seller",
  last_message_at: "Last Message At",
  last_message_preview: "Last Message Preview",
  buyer_last_read_at: "Buyer Last Read At",
  seller_last_read_at: "Seller Last Read At",
  buyer_unread_count: "Buyer Unread Count",
  seller_unread_count: "Seller Unread Count",
  buyer_deleted_at: "Buyer Deleted At",
  seller_deleted_at: "Seller Deleted At",
  buyer_blocked: "Buyer Blocked",
  seller_blocked: "Seller Blocked",
};

const MESSAGE_WRITE_MAP: Record<string, string> = {
  conversation: "Conversation",
  sender: "Sender",
  body: "Body",
  created_at: "Sent At",
  sent_at: "Sent At",
  image_url: "Image URL",
};

export const USER_EMAIL_FIELD = "Email";
export const LISTING_STATUS_FIELD = "Status";
export const CONVERSATION_LISTING_FIELD = "Listing";
export const CONVERSATION_BUYER_FIELD = "Buyer";
export const CONVERSATION_SELLER_FIELD = "Seller";
export const CONVERSATION_LAST_MESSAGE_AT_FIELD = "Last Message At";
export const MESSAGE_CONVERSATION_FIELD = "Conversation";
export const MESSAGE_SENT_AT_FIELD = "Sent At";

/** Airtable column names on SellerVerifications */
export const SELLER_VERIFICATION_STATUS_FIELD = "Status";
export const SELLER_VERIFICATION_SUBMITTED_FIELD = "Submitted At";
export const USER_VERIFICATION_STATUS_FIELD = "Verification Status";

const SELLER_VERIFICATION_WRITE_MAP: Record<string, string> = {
  user: "User",
  status: "Status",
  selfie_url: "Selfie URL",
  id_document_url: "ID Document URL",
  notes: "Notes",
  rejection_reason: "Rejection Reason",
  submitted_at: "Submitted At",
  reviewed_at: "Reviewed At",
  reviewed_by: "Reviewed By",
};

const SELLER_VERIFICATION_STATUS_TO_AIRTABLE: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** Airtable date-only columns (e.g. Reviewed At) require YYYY-MM-DD, not ISO datetime. */
function toAirtableDateOnly(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export function conversationFieldsToAirtable(fields: Record<string, unknown>): FieldSet {
  const out: FieldSet = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const airtableKey = CONVERSATION_WRITE_MAP[key] ?? key;
    out[airtableKey] = value as FieldSet[string];
  }
  return out;
}

export function messageFieldsToAirtable(fields: Record<string, unknown>): FieldSet {
  const out: FieldSet = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const airtableKey = MESSAGE_WRITE_MAP[key] ?? key;
    out[airtableKey] = value as FieldSet[string];
  }
  return out;
}

export function sellerVerificationFieldsToAirtable(fields: Record<string, unknown>): FieldSet {
  const out: FieldSet = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    let v = value;
    if (key === "status" && typeof value === "string") {
      v = SELLER_VERIFICATION_STATUS_TO_AIRTABLE[value.toLowerCase()] ?? value;
    }
    if (key === "reviewed_at") {
      const dateOnly = toAirtableDateOnly(value);
      if (!dateOnly) continue;
      out[SELLER_VERIFICATION_WRITE_MAP.reviewed_at] = dateOnly;
      continue;
    }
    const airtableKey = SELLER_VERIFICATION_WRITE_MAP[key] ?? key;
    out[airtableKey] = v as FieldSet[string];
  }
  return out;
}
