# RoofStead — Airtable schema (approved)

**App name:** RoofStead

This document is the contract between frontend, Express API, and Airtable.

**Conventions**

- Primary keys are Airtable record IDs (`rec…`), exposed as `id` in the API.
- Timestamps: **Created time** / **Last modified time** where noted.
- Long JSON blobs use **Long text** fields.
- **No hard deletes** for users or listings in admin — use `is_active`, `is_deleted`, and listing `status` only.
- Images: **Cloudinary HTTPS URLs** only (proxied through backend).

**Confirmed product decisions**

| Topic | Decision |
|--------|-----------|
| Currency | Per-listing **Single select** (ISO 4217); UI dropdown of popular currencies |
| Area | Numeric `area` + `area_unit` select (`sqft`, `sqm`); default **sqm** |
| Seller verification resubmit | **New `SellerVerifications` row** each submission; history retained |
| Messages storage | **Airtable** for now |
| Admin user removal | **Soft only**: **Deactivate** (`is_active = false`) and **Delete** (`is_deleted = true`); no record destruction |

---

## 1. `Users`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `email` | Email | Unique in app logic |
| `password_hash` | Single line text | bcrypt; never returned to client |
| `name` | Single line text | Display name in app |
| `Profile Picture URL` | URL | **Live base field name** — profile avatar (Cloudinary or `/uploads` URL) |
| `profile_picture_url` | URL | Schema alias; API maps to **Profile Picture URL** |
| `intends_seller` | Checkbox | Seller path at signup |
| `email_verified` | Checkbox | Default false until link clicked |
| `email_verification_token_hash` | Single line text | Hash only |
| `email_verification_expires_at` | Date | |
| `verification_status` | Single select | `unverified`, `pending`, `verified`, `rejected` |
| `seller_phone` | Phone | Required before verification submit |
| `seller_id_number` | Single line text | Required before verification submit |
| `seller_legal_name` | Single line text | Optional |
| `is_active` | Checkbox | Default true; admin **Deactivate** sets false — cannot log in |
| `is_deleted` | Checkbox | User soft delete or admin **Delete** |
| `deleted_at` | Date | Set when `is_deleted` becomes true |
| `deactivated_at` | Date | Set when admin deactivates |
| `last_login_at` | Date | Optional |

**Login:** reject if `is_deleted` OR `is_active = false`.

**Profile photo:** add a **URL** column named **`Profile Picture URL`** on this table (Airtable UI: **+** → **URL**). Or run `npm run airtable:profile-picture-field` from `backend/` if your API token has **schema.bases:read** and **schema.bases:write** scopes.

---

## 2. `SellerVerifications`

New row on each resubmit; prior rows kept for audit.

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `user` | Link to **Users** | Single |
| `status` | Single select | `pending`, `approved`, `rejected` |
| `selfie_url` | URL | Cloudinary |
| `id_document_url` | URL | Cloudinary |
| `notes` | Long text | Seller optional |
| `rejection_reason` | Long text | Admin on reject |
| `submitted_at` | Date | |
| `reviewed_at` | Date | |
| `reviewed_by` | Link to **AdminUsers** | Optional |

---

## 3. `AdminUsers`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `email` | Email | |
| `password_hash` | Single line text | |
| `name` | Single line text | |
| `role` | Single select | `admin`, `super_admin` |
| `is_active` | Checkbox | Default true |

---

## 4. `Listings`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `seller` | Link to **Users** | Single |
| `title` | Single line text | |
| `description` | Long text | |
| `listing_type` | Single select | `rent`, `sale` |
| `price` | Number | |
| `currency` | Single select | ISO codes: USD, EUR, GBP, … (see `backend/src/constants/currencies.ts`) |
| `address` | Single line text | |
| `city` | Single line text | Filterable |
| `floors` | Number | |
| `bedrooms` | Number | |
| `bathrooms` | Number | |
| `area` | Number | |
| `area_unit` | Single select | `sqft`, `sqm` (default sqm) |
| `amenities` | Multiple select | `parking`, `furnished`, `pet_friendly`, `elevator`, `balcony`, `garden`, `ac`, `heating` |
| `image_urls` | Long text | JSON array of Cloudinary URLs |
| `status` | Single select | `active`, `rented`, `sold`, `deleted`, `moderated_hidden` |
| `view_count` | Number | Default 0 |
| `inquiry_count` | Number | Default 0 |

**Buyer browse:** `status = active` only.

---

## 5. `Conversations`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `listing` | Link to **Listings** | Single |
| `buyer` | Link to **Users** | Single |
| `seller` | Link to **Users** | Single |
| `last_message_at` | Date | |
| `last_message_preview` | Single line text | |
| `buyer_deleted_at` | Date | Per-user soft hide |
| `seller_deleted_at` | Date | Per-user soft hide |
| `buyer_blocked` | Checkbox | |
| `seller_blocked` | Checkbox | |

---

## 6. `Messages`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `conversation` | Link to **Conversations** | Single |
| `sender` | Link to **Users** | Single |
| `body` | Long text | |
| `image_url` | URL | Optional |
| `sent_at` | Date | |

---

## 7. `Favorites`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `user` | Link to **Users** | Single |
| `listing` | Link to **Listings** | Single |

---

## 8. `SavedSearches`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `user` | Link to **Users** | Single |
| `label` | Single line text | |
| `filters_json` | Long text | Includes optional `currency`, `area_unit`, etc. |
| `is_active` | Checkbox | Default true |
| `last_notified_at` | Date | |

---

## 9. `Reports`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `reporter` | Link to **Users** | Single |
| `target_type` | Single select | `user`, `listing` |
| `target_user` | Link to **Users** | Optional |
| `target_listing` | Link to **Listings** | Optional |
| `reason` | Long text | |
| `status` | Single select | `open`, `resolved`, `dismissed` |
| `admin_notes` | Long text | |

---

## 10. `Notifications`

| Field | Airtable type | Notes |
|--------|----------------|--------|
| `user` | Link to **Users** | Single |
| `type` | Single select | `verification_approved`, `verification_rejected`, `saved_search_match`, `system` |
| `title` | Single line text | |
| `body` | Long text | |
| `payload_json` | Long text | |
| `read` | Checkbox | Default false |

---

## API enforcement summary

| Rule | Enforcement |
|------|-------------|
| Seller cannot post | `verification_status = verified` |
| Seller cannot start chat | Buyer must send first message |
| Listing soft delete | `status = deleted` |
| User soft delete | `is_deleted = true` |
| Admin deactivate | `is_active = false`, set `deactivated_at` |
| Admin delete user | `is_deleted = true`, set `deleted_at` (same as user self-delete) |
| Block | Reject message if blocked |
| Airtable key | Express proxy only |

---

## Caching

In-memory (or Redis) on listing search/browse, TTL ~30–60s; invalidate on listing mutations.

---

## Implementation order

Auth → verification + admin queue → listings → favorites → messaging → profile → admin panel.
