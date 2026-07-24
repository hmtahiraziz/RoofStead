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

export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  intends_seller?: boolean;
  email_verified?: boolean;
  email_verification_token_hash?: string;
  email_verification_expires_at?: string;
  verification_status?: UserVerificationStatus;
  is_active?: boolean;
  is_deleted?: boolean;
  profile_picture_url?: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role?: "admin" | "super_admin";
  is_active?: boolean;
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

function mapUser(record: { id: string; fields: FieldSet }): UserRecord {
  const f = record.fields;
  const passwordRaw = fieldValue(f, "password_hash", "Password Hash", "Password hash", "password");
  const role = fieldValue(f, "Role", "role");
  return {
    id: record.id,
    email: String(fieldValue(f, "email", "Email") ?? ""),
    password_hash: String(passwordRaw ?? ""),
    name: String(fieldValue(f, "name", "Name") ?? ""),
    intends_seller: Boolean(fieldValue(f, "intends_seller", "Intends Seller")) || role === "seller",
    email_verified: Boolean(fieldValue(f, "email_verified", "Email Verified")),
    email_verification_token_hash: fieldValue(f, "email_verification_token_hash", "Email Verification Token Hash")
      ? String(fieldValue(f, "email_verification_token_hash", "Email Verification Token Hash"))
      : undefined,
    email_verification_expires_at: fieldValue(f, "email_verification_expires_at", "Email Verification Expires At")
      ? String(fieldValue(f, "email_verification_expires_at", "Email Verification Expires At"))
      : undefined,
    verification_status: readVerificationStatus(f),
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

export type ListingSort = "newest" | "price_asc" | "price_desc";

export type ListingFilters = {
  city?: string;
  listing_type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  min_bedrooms?: number;
  bathrooms?: number;
  min_bathrooms?: number;
  min_area?: number;
  max_area?: number;
  search?: string;
  property_type?: string;
  sort?: ListingSort;
};

const PROPERTY_TYPE_KEYWORDS: Record<string, string[]> = {
  house: ["house", "home", "residence", "manor", "family"],
  mansion: ["mansion", "estate", "pavilion", "palace"],
  villa: ["villa", "villah"],
};

function listingMatchesPropertyType(listing: ListingRecord, propertyType: string): boolean {
  const needle = propertyType.trim().toLowerCase();
  if (!needle || needle === "all") return true;
  const haystack = `${listing.title} ${listing.description ?? ""}`.toLowerCase();
  const keywords = PROPERTY_TYPE_KEYWORDS[needle] ?? [needle];
  return keywords.some((kw) => haystack.includes(kw));
}

function listingMatchesSearch(listing: ListingRecord, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    listing.title,
    listing.description ?? "",
    listing.city,
    listing.address ?? "",
    String(listing.bedrooms),
    String(listing.bathrooms),
    String(listing.area),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function sortListings(listings: ListingRecord[], sort?: ListingSort): ListingRecord[] {
  const rows = [...listings];
  if (sort === "price_asc") {
    rows.sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    rows.sort((a, b) => b.price - a.price);
  }
  return rows;
}

export async function listActiveListings(filters: ListingFilters): Promise<ListingRecord[]> {
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
  if (filters.max_price != null && !Number.isNaN(filters.max_price)) {
    listings = listings.filter((l) => l.price <= filters.max_price!);
  }
  if (filters.min_bedrooms != null && !Number.isNaN(filters.min_bedrooms)) {
    listings = listings.filter((l) => l.bedrooms >= filters.min_bedrooms!);
  }
  if (filters.bedrooms != null && !Number.isNaN(filters.bedrooms)) {
    listings = listings.filter((l) => l.bedrooms === filters.bedrooms);
  }
  if (filters.min_bathrooms != null && !Number.isNaN(filters.min_bathrooms)) {
    listings = listings.filter((l) => l.bathrooms >= filters.min_bathrooms!);
  }
  if (filters.bathrooms != null && !Number.isNaN(filters.bathrooms)) {
    listings = listings.filter((l) => l.bathrooms === filters.bathrooms);
  }
  if (filters.min_area != null && !Number.isNaN(filters.min_area)) {
    listings = listings.filter((l) => l.area >= filters.min_area!);
  }
  if (filters.max_area != null && !Number.isNaN(filters.max_area)) {
    listings = listings.filter((l) => l.area <= filters.max_area!);
  }
  if (filters.search?.trim()) {
    listings = listings.filter((l) => listingMatchesSearch(l, filters.search!));
  }
  if (filters.property_type?.trim()) {
    listings = listings.filter((l) => listingMatchesPropertyType(l, filters.property_type!));
  }

  return sortListings(listings, filters.sort);
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

export async function findConversationForListingAndParticipants(
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<ConversationRecord | null> {
  const rows = await listConversationsForUser(buyerId);
  return (
    rows.find(
      (c) => c.listing_id === listingId && c.buyer_id === buyerId && c.seller_id === sellerId,
    ) ?? null
  );
}

export async function findConversationsForListingAsSeller(
  listingId: string,
  sellerId: string,
): Promise<ConversationRecord[]> {
  const rows = await listConversationsForUser(sellerId);
  return rows
    .filter((c) => c.listing_id === listingId && c.seller_id === sellerId)
    .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
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
