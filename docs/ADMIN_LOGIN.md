# Admin login (RoofStead)

Admin accounts live in the **`AdminUsers`** Airtable table — not in **`Users`**. Buyer/seller login uses `/api/auth/login`; admin uses `/api/admin/login`.

## 1. Create `AdminUsers` in Airtable

| Field | Type |
|--------|------|
| `email` | Email |
| `password_hash` | Single line text |
| `name` | Single line text |
| `role` | Single select: `admin`, `super_admin` |
| `is_active` | Checkbox (default checked) |

## 2. Seed the super admin

In `backend/.env`, set Airtable credentials and optional overrides:

```env
SUPER_ADMIN_EMAIL=admin@roofstead.local
SUPER_ADMIN_PASSWORD=SuperAdmin123!
SUPER_ADMIN_NAME=Super Admin
```

Run:

```bash
cd backend
npm run seed:admin
```

This creates or updates one row with `role = super_admin` and a bcrypt `password_hash`.

## 3. Log in via API

```http
POST http://localhost:4000/api/admin/login
Content-Type: application/json

{
  "email": "admin@roofstead.local",
  "password": "ChangeMe-SuperAdmin-123!"
}
```

Response:

```json
{
  "token": "<JWT>",
  "admin": { "id": "rec...", "email": "...", "name": "...", "role": "super_admin" }
}
```

Use the token on admin routes:

```http
Authorization: Bearer <JWT>
```

Example: `GET /api/admin/me`

## 4. Log in via the web UI

1. Start backend and frontend (`npm run dev` in each folder).
2. Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login).
3. Enter the same email/password as `SUPER_ADMIN_*` in `.env`.
4. The UI stores the admin JWT in `localStorage` and redirects to `/admin`.

### DNS / “ENOTFOUND api.airtable.com”

If admin login returns **500** and the backend log shows `getaddrinfo ENOTFOUND api.airtable.com`, Windows cannot resolve Airtable (often a router DNS like `gpon.net` timing out). Set your network adapter DNS to **1.1.1.1** and **8.8.8.8**, then retry.

In **development** only, if Airtable is unreachable you can still sign in with **`SUPER_ADMIN_EMAIL`** / **`SUPER_ADMIN_PASSWORD`** from `backend/.env` (offline dev mode; verification queue and other Airtable routes still need working DNS).

The API also sets Node DNS to **`DNS_SERVERS`** (default `1.1.1.1,8.8.8.8` in dev via `backend/.env`) so Airtable works even when router DNS fails — no Windows admin required. For a system-wide fix, run `backend/scripts/fix-windows-dns.ps1` as Administrator.

### If login works but the queue is empty or shows a warning

`POST /api/admin/login` can succeed while `GET /api/admin/verifications` fails if Airtable cannot read the **`SellerVerifications`** table.

1. In your base, create table **`SellerVerifications`** (exact name) with fields from [AIRTABLE_SCHEMA.md](./AIRTABLE_SCHEMA.md) § SellerVerifications.
2. Regenerate or edit your [Airtable personal access token](https://airtable.com/create/tokens): scopes **`data.records:read`** and **`data.records:write`**, and access to your **RoofStead base**.
3. Update `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` in `backend/.env`, restart the API.

`AdminUsers` and `Users` may work while `SellerVerifications` does not if that table is missing or the token was created before the table existed (re-save token base access if needed).

## Email (Nodemailer)

Templates live under `backend/src/lib/mail/templates/`:

| Template ID | When sent |
|-------------|-----------|
| `email_verification` | User registers |
| `seller_verification_submitted` | Seller submits ID/selfie (`POST /api/seller/verification/submit`) |
| `seller_verification_approved` | Admin approves (`POST /api/admin/verifications/:id/approve`) |
| `seller_verification_rejected` | Admin rejects (`POST /api/admin/verifications/:id/reject`) |

Configure SMTP in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`).  
If SMTP is empty in development, mail is logged via Nodemailer JSON transport (no delivery).

Verification links use `API_PUBLIC_URL` (default `http://localhost:4000`) and redirect to the frontend after `GET /api/auth/verify-email?token=...`.
