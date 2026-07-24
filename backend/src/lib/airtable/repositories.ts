import type { FieldSet } from "airtable";
import { getAirtableBase } from "./client";
import {
  listingFieldsToAirtable,
  LISTING_STATUS_FIELD,
  SELLER_VERIFICATION_STATUS_FIELD,
  SELLER_VERIFICATION_SUBMITTED_FIELD,
  sellerVerificationFieldsToAirtable,
  USER_EMAIL_FIELD,
  USER_VERIFICATION_STATUS_FIELD,
  userFieldsToAirtable,
} from "./fieldMaps";
import { airtableErrorCode } from "./errors";
import { AirtableTables } from "./tables";

export type UserVerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type UserRole = "buyer" | "seller";

export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role?: UserRole;
  intends_seller?: boolean;
  refresh_token_hash?: string;
  email_verified?: boolean;
  email_verification_token_hash?: string;
  email_verification_expires_at?: string;
  verification_status?: UserVerificationStatus;
  is_active?: boolean;
  is_deleted?: boolean;
  profile_picture_url?: string;
  seller_phone?: string;
  seller_id_number?: string;
  seller_legal_name?: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role?: "admin" | "super_admin";
  is_active?: boolean;
  refresh_token_hash?: string;
};

export type ListingRecord = {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  listing_type: "rent" | "sale";
  price: number;
  currency: string;
  address?: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  area_unit: "sqft" | "sqm";
  image_urls: string[];
  status: string;
};

export type SellerVerificationRecord = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  selfie_url?: string;
  id_document_url?: string;
  notes?: string;
  rejection_reason?: string;
  submitted_at?: string;
};

export type ConversationRecord = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at?: string;
  last_message_preview?: string;
};

export type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at?: string;
};

type AirtableFields = FieldSet | Partial<FieldSet>;

function firstLink(value: unknown): string {
  if (Array.isArray(value) && value.length) return String(value[0]);
  if (typeof value === "string") return value;
  return "";
}

function readVerificationStatus(f: FieldSet): UserVerificationStatus | undefined {
  const raw = String(fieldValue(f, "verification_status", "Verification Status") ?? "").toLowerCase();
  if (raw === "verified") return "verified";
  if (raw === "rejected") return "rejected";
  if (raw === "pending") return "pending";
  if (raw === "unverified") return "unverified";
  return undefined;
}

function readUserRole(f: FieldSet, intendsSeller: boolean): UserRole {
  const raw = String(fieldValue(f, "role", "Role") ?? "").toLowerCase();
  if (raw === "seller" || intendsSeller) return "seller";
  return "buyer";
}

function mapUser(record: { id: string; fields: FieldSet }): UserRecord {
  const f = record.fields;
  const passwordRaw = fieldValue(f, "password_hash", "Password Hash", "Password hash", "password");
  const airtableRole = fieldValue(f, "Role", "role");
  const intendsSeller =
    Boolean(fieldValue(f, "intends_seller", "Intends Seller")) || airtableRole === "seller";
  return {
    id: record.id,
    email: String(fieldValue(f, "email", "Email") ?? ""),
    password_hash: String(passwordRaw ?? ""),
    name: String(fieldValue(f, "name", "Name") ?? ""),
    role: readUserRole(f, intendsSeller),
    intends_seller: intendsSeller,
    email_verified: Boolean(fieldValue(f, "email_verified", "Email Verified")),
    email_verification_token_hash: fieldValue(f, "email_verification_token_hash", "Email Verification Token Hash")
      ? String(fieldValue(f, "email_verification_token_hash", "Email Verification Token Hash"))
      : undefined,
    email_verification_expires_at: fieldValue(f, "email_verification_expires_at", "Email Verification Expires At")
      ? String(fieldValue(f, "email_verification_expires_at", "Email Verification Expires At"))
      : undefined,
    verification_status: readVerificationStatus(f),
    refresh_token_hash: fieldValue(f, "refresh_token_hash", "Refresh Token Hash")
      ? String(fieldValue(f, "refresh_token_hash", "Refresh Token Hash"))
      : undefined,
    is_active: fieldValue(f, "is_active", "Is Active") !== false,
    is_deleted: Boolean(fieldValue(f, "is_deleted", "Is Deleted")),
    profile_picture_url: fieldValue(
      f,
      "profile_picture_url",
      "Profile Picture URL",
      "Profile picture url",
      "Avatar URL",
    )
      ? String(
          fieldValue(
            f,
            "profile_picture_url",
            "Profile Picture URL",
            "Profile picture url",
            "Avatar URL",
          ),
        )
      : undefined,
    seller_phone: fieldValue(f, "seller_phone", "Seller Phone", "Phone")
      ? String(fieldValue(f, "seller_phone", "Seller Phone", "Phone"))
      : undefined,
    seller_id_number: fieldValue(f, "seller_id_number", "Seller ID Number", "ID Number")
      ? String(fieldValue(f, "seller_id_number", "Seller ID Number", "ID Number"))
      : undefined,
    seller_legal_name: fieldValue(f, "seller_legal_name", "Seller Legal Name", "Legal Name")
      ? String(fieldValue(f, "seller_legal_name", "Seller Legal Name", "Legal Name"))
      : undefined,
  };
}

function mapAdmin(record: { id: string; fields: FieldSet }): AdminUserRecord {
  const f = record.fields;
  return {
    id: record.id,
    email: String(f.email ?? ""),
    password_hash: String(f.password_hash ?? ""),
    name: String(f.name ?? ""),
    role: f.role as AdminUserRecord["role"],
    is_active: f.is_active !== false,
    refresh_token_hash: f.refresh_token_hash ? String(f.refresh_token_hash) : undefined,
  };
}

function parseImageUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return raw.startsWith("http") ? [raw] : [];
    }
  }
  return [];
}

function fieldValue(f: FieldSet, ...keys: string[]): unknown {
  for (const key of keys) {
    if (f[key] !== undefined && f[key] !== null && f[key] !== "") return f[key];
  }
  return undefined;
}

function readListingType(f: FieldSet): "rent" | "sale" {
  const raw = String(
    fieldValue(f, "listing_type", "Listing type", "Listing Type", "type", "Type") ?? "",
  ).toLowerCase();
  return raw === "rent" ? "rent" : "sale";
}

function mapListing(record: { id: string; fields: FieldSet }): ListingRecord {
  const f = record.fields;
  const areaSqft = fieldValue(f, "area", "Area (sqft)", "Area");
  return {
    id: record.id,
    seller_id: firstLink(fieldValue(f, "seller", "Seller") ?? f.seller),
    title: String(fieldValue(f, "title", "Title") ?? ""),
    description: fieldValue(f, "description", "Description")
      ? String(fieldValue(f, "description", "Description"))
      : undefined,
    listing_type: readListingType(f),
    price: Number(fieldValue(f, "price", "Price") ?? 0),
    currency: String(fieldValue(f, "currency", "Currency") ?? "USD"),
    address: fieldValue(f, "address", "Address") ? String(fieldValue(f, "address", "Address")) : undefined,
    city: String(fieldValue(f, "city", "City") ?? ""),
    bedrooms: Number(fieldValue(f, "bedrooms", "Bedrooms") ?? 0),
    bathrooms: Number(fieldValue(f, "bathrooms", "Bathrooms") ?? 0),
    area: Number(areaSqft ?? 0),
    area_unit: fieldValue(f, "area_unit", "Area Unit") === "sqm" ? "sqm" : "sqft",
    image_urls: parseImageUrls(fieldValue(f, "image_urls", "Image URLs")),
    status: String(fieldValue(f, "status", "Status") ?? "active").toLowerCase(),
  };
}

function mapVerification(record: { id: string; fields: FieldSet }): SellerVerificationRecord {
  const f = record.fields;
  const statusRaw = String(fieldValue(f, "status", "Status") ?? "pending").toLowerCase();
  const status =
    statusRaw === "approved" || statusRaw === "rejected"
      ? (statusRaw as SellerVerificationRecord["status"])
      : "pending";
  return {
    id: record.id,
    user_id: firstLink(fieldValue(f, "user", "User") ?? f.user),
    status,
    selfie_url: fieldValue(f, "selfie_url", "Selfie URL", "Selfie Url")
      ? String(fieldValue(f, "selfie_url", "Selfie URL", "Selfie Url"))
      : undefined,
    id_document_url: fieldValue(f, "id_document_url", "ID Document URL", "Id Document URL", "ID document URL")
      ? String(fieldValue(f, "id_document_url", "ID Document URL", "Id Document URL", "ID document URL"))
      : undefined,
    notes: fieldValue(f, "notes", "Notes") ? String(fieldValue(f, "notes", "Notes")) : undefined,
    rejection_reason: fieldValue(f, "rejection_reason", "Rejection Reason")
      ? String(fieldValue(f, "rejection_reason", "Rejection Reason"))
      : undefined,
    submitted_at: fieldValue(f, "submitted_at", "Submitted At", "Submitted at")
      ? String(fieldValue(f, "submitted_at", "Submitted At", "Submitted at"))
      : undefined,
  };
}

function mapConversation(record: { id: string; fields: FieldSet }): ConversationRecord {
  const f = record.fields;
  return {
    id: record.id,
    listing_id: firstLink(f.listing),
    buyer_id: firstLink(f.buyer),
    seller_id: firstLink(f.seller),
    last_message_at: f.last_message_at ? String(f.last_message_at) : undefined,
    last_message_preview: f.last_message_preview ? String(f.last_message_preview) : undefined,
  };
}

function mapMessage(record: { id: string; fields: FieldSet }): MessageRecord {
  const f = record.fields;
  return {
    id: record.id,
    conversation_id: firstLink(f.conversation),
    sender_id: firstLink(f.sender),
    body: String(f.body ?? ""),
    created_at: f.created_at ? String(f.created_at) : undefined,
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const base = getAirtableBase();
  const records = await base(AirtableTables.Users)
    .select({
      filterByFormula: `{${USER_EMAIL_FIELD}} = '${email.toLowerCase().replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    })
    .firstPage();

  if (!records.length) return null;
  return mapUser(records[0]);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const base = getAirtableBase();
  try {
    const record = await base(AirtableTables.Users).find(id);
    return mapUser(record);
  } catch {
    return null;
  }
}

export async function listUsersForAdmin(maxRecords = 100): Promise<UserRecord[]> {
  const base = getAirtableBase();
  const records = await base(AirtableTables.Users).select({ maxRecords }).all();
  return records.map(mapUser);
}

export async function listUsersPendingVerification(maxRecords = 100): Promise<UserRecord[]> {
  const base = getAirtableBase();
  const filterByFormula = `LOWER({${USER_VERIFICATION_STATUS_FIELD}}) = 'pending'`;
  try {
    const records = await base(AirtableTables.Users)
      .select({ filterByFormula, maxRecords })
      .all();
    return records.map(mapUser).filter((u) => !u.is_deleted);
  } catch {
    const all = await listUsersForAdmin(maxRecords);
    return all.filter((u) => u.verification_status === "pending" && !u.is_deleted);
  }
}

export async function createUser(fields: AirtableFields): Promise<UserRecord> {
  const base = getAirtableBase();
  const airtableFields = userFieldsToAirtable(fields as Record<string, unknown>);
  const created = await base(AirtableTables.Users).create([{ fields: airtableFields }]);
  return mapUser(created[0]);
}

export async function updateUser(id: string, fields: AirtableFields): Promise<UserRecord> {
  const base = getAirtableBase();
  const airtableFields = userFieldsToAirtable(fields as Record<string, unknown>);
  const updated = await base(AirtableTables.Users).update([{ id, fields: airtableFields }]);
  return mapUser(updated[0]);
}

export async function findAdminByEmail(email: string): Promise<AdminUserRecord | null> {
  const base = getAirtableBase();
  const records = await base(AirtableTables.AdminUsers)
    .select({
      filterByFormula: `{email} = '${email.toLowerCase().replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    })
    .firstPage();

  if (!records.length) return null;
  return mapAdmin(records[0]);
}

export async function findAdminById(id: string): Promise<AdminUserRecord | null> {
  const base = getAirtableBase();
  try {
    const record = await base(AirtableTables.AdminUsers).find(id);
    return mapAdmin(record);
  } catch {
    return null;
  }
}

export async function createAdminUser(fields: AirtableFields): Promise<AdminUserRecord> {
  const base = getAirtableBase();
  const created = await base(AirtableTables.AdminUsers).create([
    { fields } as { fields: FieldSet },
  ]);
  return mapAdmin(created[0]);
}

export async function updateAdminUser(id: string, fields: AirtableFields): Promise<AdminUserRecord> {
  const base = getAirtableBase();
  const updated = await base(AirtableTables.AdminUsers).update([
    { id, fields } as { id: string; fields: FieldSet },
  ]);
  return mapAdmin(updated[0]);
}

export async function updateSellerVerification(id: string, fields: AirtableFields): Promise<void> {
  const base = getAirtableBase();
  const airtableFields = sellerVerificationFieldsToAirtable(fields as Record<string, unknown>);
  await base(AirtableTables.SellerVerifications).update([{ id, fields: airtableFields }]);
}

export async function createSellerVerification(fields: AirtableFields): Promise<string> {
  const base = getAirtableBase();
  const airtableFields = sellerVerificationFieldsToAirtable(fields as Record<string, unknown>);
  const created = await base(AirtableTables.SellerVerifications).create([{ fields: airtableFields }]);
  return created[0].id;
}

export async function findSellerVerificationById(id: string): Promise<SellerVerificationRecord | null> {
  const base = getAirtableBase();
  try {
    const record = await base(AirtableTables.SellerVerifications).find(id);
    return mapVerification(record);
  } catch {
    return null;
  }
}

export async function findLatestSellerVerificationByUserId(
  userId: string,
): Promise<SellerVerificationRecord | null> {
  const base = getAirtableBase();
  const escapedId = userId.replace(/'/g, "\\'");
  try {
    const records = await base(AirtableTables.SellerVerifications)
      .select({
        filterByFormula: `FIND('${escapedId}', ARRAYJOIN({User}))`,
        maxRecords: 10,
        sort: [{ field: SELLER_VERIFICATION_SUBMITTED_FIELD, direction: "desc" }],
      })
      .all();
    if (!records.length) return null;
    return mapVerification(records[0]);
  } catch {
    const records = await base(AirtableTables.SellerVerifications).select({ maxRecords: 100 }).all();
    const matches = records
      .map(mapVerification)
      .filter((row) => row.user_id === userId)
      .sort((a, b) => String(b.submitted_at ?? "").localeCompare(String(a.submitted_at ?? "")));
    return matches[0] ?? null;
  }
}

export async function listPendingSellerVerifications(): Promise<SellerVerificationRecord[]> {
  const base = getAirtableBase();
  const filterByFormula = `LOWER({${SELLER_VERIFICATION_STATUS_FIELD}}) = 'pending'`;

  const sortCandidates = [
    SELLER_VERIFICATION_SUBMITTED_FIELD,
    "Submitted at",
    "Created",
    "created_at",
  ];

  for (const sortField of sortCandidates) {
    try {
      const records = await base(AirtableTables.SellerVerifications)
        .select({
          filterByFormula,
          maxRecords: 50,
          sort: [{ field: sortField, direction: "desc" }],
        })
        .all();
      return records.map(mapVerification);
    } catch (err) {
      if (airtableErrorCode(err) === "UNKNOWN_FIELD_NAME") continue;
      throw err;
    }
  }

  const records = await base(AirtableTables.SellerVerifications)
    .select({ filterByFormula, maxRecords: 50 })
    .all();
  return records.map(mapVerification);
}

export async function listActiveListings(filters: {
  city?: string;
  listing_type?: string;
  min_price?: number;
}): Promise<ListingRecord[]> {
  const base = getAirtableBase();

  let records;
  try {
    records = await base(AirtableTables.Listings)
      .select({
        filterByFormula: `LOWER({${LISTING_STATUS_FIELD}}) = 'active'`,
        maxRecords: 100,
      })
      .all();
  } catch {
    records = await base(AirtableTables.Listings).select({ maxRecords: 100 }).all();
  }

  let listings = records.map(mapListing).filter((l) => l.status === "active");

  if (filters.listing_type === "rent" || filters.listing_type === "sale") {
    listings = listings.filter((l) => l.listing_type === filters.listing_type);
  }
  if (filters.city?.trim()) {
    const needle = filters.city.trim().toLowerCase();
    listings = listings.filter((l) => l.city.toLowerCase().includes(needle));
  }
  if (filters.min_price != null && !Number.isNaN(filters.min_price)) {
    listings = listings.filter((l) => l.price >= filters.min_price!);
  }

  return listings;
}

export async function listAllListingsForAdmin(maxRecords = 100): Promise<ListingRecord[]> {
  const base = getAirtableBase();
  const records = await base(AirtableTables.Listings).select({ maxRecords }).all();
  return records.map(mapListing);
}

export async function findListingById(id: string): Promise<ListingRecord | null> {
  const base = getAirtableBase();
  try {
    const record = await base(AirtableTables.Listings).find(id);
    return mapListing(record);
  } catch {
    return null;
  }
}

export async function createListing(fields: AirtableFields): Promise<ListingRecord> {
  const base = getAirtableBase();
  const raw = { ...(fields as Record<string, unknown>) };
  if (raw.area_unit === "sqm" && raw.area != null) {
    raw.area = Math.round(Number(raw.area) * 10.7639);
  }
  delete raw.area_unit;
  const airtableFields = listingFieldsToAirtable(raw);
  const created = await base(AirtableTables.Listings).create([{ fields: airtableFields }]);
  return mapListing(created[0]);
}

export async function listListingsBySeller(sellerId: string): Promise<ListingRecord[]> {
  const base = getAirtableBase();
  const escapedId = sellerId.replace(/'/g, "\\'");
  let records;
  try {
    records = await base(AirtableTables.Listings)
      .select({
        filterByFormula: `FIND('${escapedId}', ARRAYJOIN({Seller}))`,
        maxRecords: 100,
      })
      .all();
  } catch {
    const all = await base(AirtableTables.Listings).select({ maxRecords: 100 }).all();
    records = all.filter((r) => firstLink(fieldValue(r.fields, "seller", "Seller") ?? r.fields.seller) === sellerId);
  }
  return records
    .map(mapListing)
    .filter((l) => l.status !== "deleted")
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function updateListing(id: string, fields: AirtableFields): Promise<ListingRecord> {
  const base = getAirtableBase();
  const raw = { ...(fields as Record<string, unknown>) };
  if (raw.area_unit === "sqm" && raw.area != null) {
    raw.area = Math.round(Number(raw.area) * 10.7639);
  }
  delete raw.area_unit;
  const airtableFields = listingFieldsToAirtable(raw);
  const updated = await base(AirtableTables.Listings).update([{ id, fields: airtableFields }]);
  return mapListing(updated[0]);
}

export async function listConversationsForUser(userId: string): Promise<ConversationRecord[]> {
  const base = getAirtableBase();
  const records = await base(AirtableTables.Conversations)
    .select({
      filterByFormula: `OR(FIND('${userId}', ARRAYJOIN({buyer})), FIND('${userId}', ARRAYJOIN({seller})))`,
      maxRecords: 50,
      sort: [{ field: "last_message_at", direction: "desc" }],
    })
    .all()
    .catch(async () => {
      const all = await base(AirtableTables.Conversations).select({ maxRecords: 50 }).all();
      return all.filter((r) => {
        const buyer = firstLink(r.fields.buyer);
        const seller = firstLink(r.fields.seller);
        return buyer === userId || seller === userId;
      });
    });

  return records.map(mapConversation);
}

export async function findConversationById(id: string): Promise<ConversationRecord | null> {
  const base = getAirtableBase();
  try {
    return mapConversation(await base(AirtableTables.Conversations).find(id));
  } catch {
    return null;
  }
}

export async function createConversation(fields: AirtableFields): Promise<ConversationRecord> {
  const base = getAirtableBase();
  const created = await base(AirtableTables.Conversations).create([
    { fields } as { fields: FieldSet },
  ]);
  return mapConversation(created[0]);
}

export async function updateConversation(id: string, fields: AirtableFields): Promise<void> {
  const base = getAirtableBase();
  await base(AirtableTables.Conversations).update([{ id, fields } as { id: string; fields: FieldSet }]);
}

export async function listMessagesForConversation(conversationId: string): Promise<MessageRecord[]> {
  const base = getAirtableBase();
  const records = await base(AirtableTables.Messages)
    .select({
      filterByFormula: `FIND('${conversationId}', ARRAYJOIN({conversation}))`,
      maxRecords: 200,
      sort: [{ field: "created_at", direction: "asc" }],
    })
    .all()
    .catch(async () => {
      const all = await base(AirtableTables.Messages).select({ maxRecords: 200 }).all();
      return all.filter((r) => firstLink(r.fields.conversation) === conversationId);
    });

  return records.map(mapMessage);
}

export async function createMessage(fields: AirtableFields): Promise<MessageRecord> {
  const base = getAirtableBase();
  const created = await base(AirtableTables.Messages).create([{ fields } as { fields: FieldSet }]);
  return mapMessage(created[0]);
}
