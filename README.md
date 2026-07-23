# RoofStead

House rental and sale marketplace — **Next.js** frontend + **Express** API proxy to **Airtable**, with **Socket.io** messaging and **Cloudinary** images.

## Repository layout

| Folder | Stack | Role |
|--------|--------|------|
| [`frontend/`](./frontend/) | Next.js (App Router, TypeScript) | Buyer/seller UX, admin panel routes, talks only to Express |
| [`backend/`](./backend/) | Node.js + Express (TypeScript) | Auth, Airtable, Cloudinary uploads, Socket.io, email |

## Stitch design

Project: [Stitch — RoofStead design](https://stitch.withgoogle.com/projects/18354210524743888148)

Design source: [Stitch project 18354210524743888148](https://stitch.withgoogle.com/projects/18354210524743888148). Exported HTML is in `frontend/stitch-export/`; the marketplace UI uses the same Material-style tokens (Tailwind) as the **Home Search & Browse** screen. Re-sync with `node frontend/scripts/sync-stitch-design.mjs` — see **[docs/STITCH_SYNC.md](./docs/STITCH_SYNC.md)**.

## Before full CRUD

Review and approve **[docs/AIRTABLE_SCHEMA.md](./docs/AIRTABLE_SCHEMA.md)** (schema signed off — implementation in progress).

**Product defaults:** RoofStead branding, per-listing currency dropdown, area + unit (default m²), verification history as new rows, messages on Airtable, admin user actions = deactivate + soft delete only.

## Local development

### Backend

```bash
cd backend
cp .env.example .env   # fill Airtable, Cloudinary, SMTP, JWT secrets
npm run dev            # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

## Suggested build order (post schema approval)

1. Airtable base + tables  
2. Auth (signup, email verification, login)  
3. Seller verification + admin approve/reject  
4. Listings CRUD, browse, filters, soft delete  
5. Favorites  
6. Messaging (Socket.io, buyer-initiates-only)  
7. Profile + soft delete  
8. Admin panel (separate JWT): users, verification queue, listings, reports, stats  
