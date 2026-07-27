import type { FieldSet } from "airtable";
import { getAirtableBase } from "./client";
import {
  conversationFieldsToAirtable,
  CONVERSATION_BUYER_FIELD,
  CONVERSATION_LAST_MESSAGE_AT_FIELD,
  CONVERSATION_SELLER_FIELD,
  listingFieldsToAirtable,
  LISTING_STATUS_FIELD,
  messageFieldsToAirtable,
  MESSAGE_CONVERSATION_FIELD,
  MESSAGE_SENT_AT_FIELD,
  SELLER_VERIFICATION_STATUS_FIELD,
  SELLER_VERIFICATION_SUBMITTED_FIELD,
  sellerVerificationFieldsToAirtable,
  USER_EMAIL_FIELD,
  USER_VERIFICATION_STATUS_FIELD,
  userFieldsToAirtable,
} from "./fieldMaps";
import { airtableErrorCode, isAirtableUnknownField } from "./errors";
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
  reviewed_at?: string;
};

export type ConversationRecord = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at?: string;
  last_message_preview?: string;
  buyer_last_read_at?: string;
  seller_last_read_at?: string;
  buyer_unread_count?: number;
  seller_unread_count?: number;
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
  const airtableRole = String(fieldValue(f, "Role", "role") ?? "").toLowerCase();
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

function normalizeListingStatus(raw: string): string {
  const status = raw.toLowerCase();
  if (status === "pending" || status === "approved") return "active";
  return status;
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
    status: normalizeListingStatus(String(fieldValue(f, "status", "Status") ?? "active")),
  };
}

function firstAttachmentUrl(value: unknown): string | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const first = value[0] as { url?: string };
  return first?.url ? String(first.url) : undefined;
}

function isSellerVerificationFields(f: FieldSet): boolean {
  const userLink = firstLink(fieldValue(f, "user", "User") ?? f.user);
  if (userLink) return true;
  // Airtable .find(id) is base-wide — reject User rows (Name/Email) mistaken as verifications.
  const hasUserIdentity = fieldValue(f, "name", "Name") ?? fieldValue(f, "email", "Email");
  if (hasUserIdentity) return false;
  return Boolean(fieldValue(f, "submitted_at", "Submitted At", "Submitted at"));
}

function mapVerification(record: { id: string; fields: FieldSet }): SellerVerificationRecord {
  const f = record.fields;
  const statusRaw = String(fieldValue(f, "status", "Status") ?? "pending").toLowerCase();
  const status =
    statusRaw === "approved" || statusRaw === "rejected"
      ? (statusRaw as SellerVerificationRecord["status"])
      : "pending";
  const selfieUrl =
    fieldValue(f, "selfie_url", "Selfie URL", "Selfie Url") ??
    firstAttachmentUrl(f["Selfie/Live Photo"]);
  const idDocumentUrl =
    fieldValue(f, "id_document_url", "ID Document URL", "Id Document URL", "ID document URL") ??
    firstAttachmentUrl(f["ID Card / Passport Image"]);
  return {
    id: record.id,
    user_id: firstLink(fieldValue(f, "user", "User") ?? f.user),
    status,
    selfie_url: selfieUrl ? String(selfieUrl) : undefined,
    id_document_url: idDocumentUrl ? String(idDocumentUrl) : undefined,
    notes: fieldValue(f, "notes", "Notes") ? String(fieldValue(f, "notes", "Notes")) : undefined,
    rejection_reason: fieldValue(f, "rejection_reason", "Rejection Reason", "Admin Notes")
      ? String(fieldValue(f, "rejection_reason", "Rejection Reason", "Admin Notes"))
      : undefined,
    submitted_at: fieldValue(f, "submitted_at", "Submitted At", "Submitted at")
      ? String(fieldValue(f, "submitted_at", "Submitted At", "Submitted at"))
      : undefined,
    reviewed_at: fieldValue(f, "reviewed_at", "Reviewed At", "Reviewed at")
      ? String(fieldValue(f, "reviewed_at", "Reviewed At", "Reviewed at"))
      : undefined,
  };
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function conversationThreadKey(c: ConversationRecord): string {
  return `${c.listing_id}:${c.buyer_id}:${c.seller_id}`;
}

async function listAllConversationRecords(): Promise<ConversationRecord[]> {
  const base = getAirtableBase();
  const all = await base(AirtableTables.Conversations).select({ maxRecords: 200 }).all();
  return all.map(mapConversation);
}

function dedupeConversationRecords(rows: ConversationRecord[]): ConversationRecord[] {
  const groups = new Map<string, ConversationRecord[]>();
  for (const row of rows) {
    if (!row.listing_id || !row.buyer_id || !row.seller_id) continue;
    const key = conversationThreadKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const deduped: ConversationRecord[] = [];
  for (const group of groups.values()) {
    const sorted = group.sort((a, b) =>
      (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""),
    );
    const canonical = { ...sorted[0] };
    canonical.buyer_unread_count = group.reduce((sum, c) => sum + (c.buyer_unread_count ?? 0), 0);
    canonical.seller_unread_count = group.reduce((sum, c) => sum + (c.seller_unread_count ?? 0), 0);
    const withPreview = sorted.find((c) => c.last_message_preview?.trim());
    if (withPreview?.last_message_preview) {
      canonical.last_message_preview = withPreview.last_message_preview;
    }
    deduped.push(canonical);
  }

  return deduped.sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
}

export async function getConversationSiblings(
  conversation: ConversationRecord,
): Promise<ConversationRecord[]> {
  const all = await listAllConversationRecords();
  return all.filter(
    (c) =>
      c.listing_id === conversation.listing_id &&
      c.buyer_id === conversation.buyer_id &&
      c.seller_id === conversation.seller_id,
  );
}

export async function resolveCanonicalConversation(
  conversation: ConversationRecord,
): Promise<ConversationRecord> {
  const siblings = await getConversationSiblings(conversation);
  if (siblings.length <= 1) return conversation;
  return siblings.sort((a, b) =>
    (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""),
  )[0];
}

export async function listMessagesForConversationThread(
  conversation: ConversationRecord,
): Promise<MessageRecord[]> {
  const siblings = await getConversationSiblings(conversation);
  const messageLists = await Promise.all(siblings.map((s) => listMessagesForConversation(s.id)));
  const byId = new Map<string, MessageRecord>();
  for (const list of messageLists) {
    for (const message of list) {
      byId.set(message.id, message);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

function mapConversation(record: { id: string; fields: FieldSet }): ConversationRecord {
  const f = record.fields;
  return {
    id: record.id,
    listing_id: firstLink(fieldValue(f, "listing", "Listing")),
    buyer_id: firstLink(fieldValue(f, "buyer", "Buyer")),
    seller_id: firstLink(fieldValue(f, "seller", "Seller")),
    last_message_at: fieldValue(f, "last_message_at", "Last Message At")
      ? String(fieldValue(f, "last_message_at", "Last Message At"))
      : undefined,
    last_message_preview: fieldValue(f, "last_message_preview", "Last Message Preview")
      ? String(fieldValue(f, "last_message_preview", "Last Message Preview"))
      : undefined,
    buyer_last_read_at: fieldValue(f, "buyer_last_read_at", "Buyer Last Read At")
      ? String(fieldValue(f, "buyer_last_read_at", "Buyer Last Read At"))
      : undefined,
    seller_last_read_at: fieldValue(f, "seller_last_read_at", "Seller Last Read At")
      ? String(fieldValue(f, "seller_last_read_at", "Seller Last Read At"))
      : undefined,
    buyer_unread_count: Number(fieldValue(f, "buyer_unread_count", "Buyer Unread Count") ?? 0) || 0,
    seller_unread_count: Number(fieldValue(f, "seller_unread_count", "Seller Unread Count") ?? 0) || 0,
  };
}

function mapMessage(record: { id: string; fields: FieldSet }): MessageRecord {
  const f = record.fields;
  return {
    id: record.id,
    conversation_id: firstLink(fieldValue(f, "conversation", "Conversation")),
    sender_id: firstLink(fieldValue(f, "sender", "Sender")),
    body: String(fieldValue(f, "body", "Body") ?? ""),
    created_at: fieldValue(f, "created_at", "sent_at", "Sent At")
      ? String(fieldValue(f, "created_at", "sent_at", "Sent At"))
      : undefined,
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

export type PendingVerificationQueueItem = {
  verificationId: string;
  user: UserRecord;
  submission: SellerVerificationRecord | null;
};

/** Queue is driven by Users.verification_status = pending (not orphaned SellerVerifications rows). */
export async function listPendingVerificationsForAdmin(): Promise<PendingVerificationQueueItem[]> {
  const pendingUsers = await listUsersPendingVerification();
  return Promise.all(
    pendingUsers.map(async (user) => {
      const submissions = await listSellerVerificationsByUserId(user.id);
      const pendingSubmission = submissions.find((s) => s.status === "pending") ?? null;
      return {
        verificationId: pendingSubmission?.id ?? user.id,
        user,
        submission: pendingSubmission,
      };
    }),
  );
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

  try {
    await base(AirtableTables.SellerVerifications).update([{ id, fields: airtableFields }]);
    return;
  } catch (err) {
    if (!isAirtableUnknownField(err)) throw err;
  }

  // Retry without optional columns that may not exist in every base.
  const { "Rejection Reason": rejectionReason, "Reviewed At": reviewedAt, ...rest } =
    airtableFields as Record<string, unknown>;
  const fallback: FieldSet = { ...rest } as FieldSet;
  if (rejectionReason != null) {
    fallback["Admin Notes"] = rejectionReason as FieldSet[string];
  }
  if (reviewedAt != null) {
    fallback["Reviewed At"] = reviewedAt as FieldSet[string];
  }
  await base(AirtableTables.SellerVerifications).update([{ id, fields: fallback }]);
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
    if (!isSellerVerificationFields(record.fields)) return null;
    return mapVerification(record);
  } catch {
    return null;
  }
}

async function fetchSellerVerificationsForUser(userId: string): Promise<SellerVerificationRecord[]> {
  const base = getAirtableBase();
  const escapedId = userId.replace(/'/g, "\\'");
  try {
    const records = await base(AirtableTables.SellerVerifications)
      .select({
        filterByFormula: `FIND('${escapedId}', ARRAYJOIN({User}))`,
        maxRecords: 50,
        sort: [{ field: SELLER_VERIFICATION_SUBMITTED_FIELD, direction: "desc" }],
      })
      .all();
    return records.map(mapVerification);
  } catch {
    const records = await base(AirtableTables.SellerVerifications).select({ maxRecords: 200 }).all();
    return records
      .map(mapVerification)
      .filter((row) => row.user_id === userId)
      .sort((a, b) => String(b.submitted_at ?? "").localeCompare(String(a.submitted_at ?? "")));
  }
}

export async function findLatestSellerVerificationByUserId(
  userId: string,
): Promise<SellerVerificationRecord | null> {
  const rows = await fetchSellerVerificationsForUser(userId);
  return rows[0] ?? null;
}

export async function listSellerVerificationsByUserId(
  userId: string,
): Promise<SellerVerificationRecord[]> {
  return fetchSellerVerificationsForUser(userId);
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
  const escapedId = escapeFormulaValue(userId);

  let records;
  try {
    records = await base(AirtableTables.Conversations)
      .select({
        filterByFormula: `OR({${CONVERSATION_BUYER_FIELD}} = '${escapedId}', {${CONVERSATION_SELLER_FIELD}} = '${escapedId}')`,
        maxRecords: 200,
        sort: [{ field: CONVERSATION_LAST_MESSAGE_AT_FIELD, direction: "desc" }],
      })
      .all();
  } catch {
    records = [];
  }

  if (!records.length) {
    const all = await base(AirtableTables.Conversations).select({ maxRecords: 200 }).all();
    records = all.filter((r) => {
      const buyer = firstLink(fieldValue(r.fields, "buyer", "Buyer"));
      const seller = firstLink(fieldValue(r.fields, "seller", "Seller"));
      return buyer === userId || seller === userId;
    });
  }

  const mapped = records.map(mapConversation);

  // Merge with full scan so we never miss rows the formula skipped
  const allMapped = await listAllConversationRecords();
  const userFromAll = allMapped.filter((c) => c.buyer_id === userId || c.seller_id === userId);
  const byId = new Map<string, ConversationRecord>();
  for (const row of [...mapped, ...userFromAll]) {
    byId.set(row.id, row);
  }

  return dedupeConversationRecords(Array.from(byId.values()));
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
  const all = await listAllConversationRecords();
  const matches = all.filter(
    (c) => c.listing_id === listingId && c.buyer_id === buyerId && c.seller_id === sellerId,
  );
  if (!matches.length) return null;
  return matches.sort((a, b) =>
    (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""),
  )[0];
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
  const airtableFields = conversationFieldsToAirtable(fields as Record<string, unknown>);
  const created = await base(AirtableTables.Conversations).create([{ fields: airtableFields }]);
  return mapConversation(created[0]);
}

export async function updateConversation(id: string, fields: AirtableFields): Promise<void> {
  const base = getAirtableBase();
  const airtableFields = conversationFieldsToAirtable(fields as Record<string, unknown>);
  await base(AirtableTables.Conversations).update([{ id, fields: airtableFields }]);
}

export async function listMessagesForConversation(conversationId: string): Promise<MessageRecord[]> {
  const base = getAirtableBase();
  const escapedId = escapeFormulaValue(conversationId);

  let records;
  try {
    records = await base(AirtableTables.Messages)
      .select({
        filterByFormula: `{${MESSAGE_CONVERSATION_FIELD}} = '${escapedId}'`,
        maxRecords: 500,
        sort: [{ field: MESSAGE_SENT_AT_FIELD, direction: "asc" }],
      })
      .all();
  } catch {
    records = [];
  }

  if (!records.length) {
    const all = await base(AirtableTables.Messages).select({ maxRecords: 500 }).all();
    records = all.filter(
      (r) => firstLink(fieldValue(r.fields, "conversation", "Conversation")) === conversationId,
    );
  }

  return records
    .map(mapMessage)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

export function unreadCountForUser(conversation: ConversationRecord, userId: string): number {
  if (conversation.buyer_id === userId) return conversation.buyer_unread_count ?? 0;
  if (conversation.seller_id === userId) return conversation.seller_unread_count ?? 0;
  return 0;
}

export async function incrementUnreadForRecipient(
  conversationId: string,
  senderId: string,
): Promise<void> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return;

  const fields: AirtableFields = {};
  if (conversation.buyer_id === senderId) {
    fields.seller_unread_count = (conversation.seller_unread_count ?? 0) + 1;
  } else if (conversation.seller_id === senderId) {
    fields.buyer_unread_count = (conversation.buyer_unread_count ?? 0) + 1;
  } else {
    return;
  }
  await updateConversation(conversation.id, fields);
}

export async function markConversationRead(
  conversation: ConversationRecord,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const siblings = await getConversationSiblings(conversation);

  await Promise.all(
    siblings.map(async (sibling) => {
      const fields: AirtableFields = {};
      if (sibling.buyer_id === userId) {
        fields.buyer_last_read_at = now;
        fields.buyer_unread_count = 0;
      } else if (sibling.seller_id === userId) {
        fields.seller_last_read_at = now;
        fields.seller_unread_count = 0;
      } else {
        return;
      }
      await updateConversation(sibling.id, fields);
    }),
  );
}

export async function getTotalUnreadCountForUser(userId: string): Promise<number> {
  const rows = await listConversationsForUser(userId);
  return rows.reduce((sum, row) => sum + unreadCountForUser(row, userId), 0);
}

export async function createMessage(fields: AirtableFields): Promise<MessageRecord> {
  const base = getAirtableBase();
  const airtableFields = messageFieldsToAirtable(fields as Record<string, unknown>);
  const created = await base(AirtableTables.Messages).create([{ fields: airtableFields }]);
  return mapMessage(created[0]);
}
