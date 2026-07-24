import { Router, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserAuth } from "../middleware/auth";
import { isSellerUser } from "../lib/auth/userRole";
import { toPublicUser } from "../lib/auth/publicUser";
import { uploadListingImage } from "../lib/media/listingImage";
import { uploadVerificationImage } from "../lib/media/verificationImage";
import { isPriceWithinRange, priceRangeError } from "../lib/listings/priceRanges";
import {
  createSellerVerification,
  findLatestSellerVerificationByUserId,
  findListingById,
  findUserById,
  listListingsBySeller,
  updateListing,
  updateUser,
} from "../lib/airtable/repositories";
import { toSellerListing, type SellerListingStatus } from "../lib/listings/transform";
import { notifySellerVerificationSubmitted } from "../services/auth.service";

const submitSchema = z.object({
  selfieUrl: z.string().url(),
  idDocumentUrl: z.string().url(),
  legalName: z.string().min(1).max(120),
  idNumber: z.string().min(1).max(80),
  phone: z.string().min(5).max(30),
  notes: z.string().max(2000).optional(),
});

const updateListingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  listing_type: z.enum(["rent", "sale"]).optional(),
  price: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  city: z.string().min(1).optional(),
  address: z.string().optional(),
  area: z.number().positive().optional(),
  area_unit: z.enum(["sqft", "sqm"]).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  image_urls: z.array(z.string().url()).optional(),
});

const statusSchema = z.object({
  status: z.enum(["active", "sold", "rented", "deleted"]),
});

const MAX_LISTING_IMAGES = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/webp") {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
  },
});

const listingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_LISTING_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/webp") {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
  },
});

export const sellerRouter = Router();

async function requireSellerAccount(req: AuthedRequest, res: Response) {
  const user = await findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  if (!isSellerUser(user)) {
    res.status(403).json({ error: "Seller account required" });
    return null;
  }
  return user;
}

async function requireOwnedListing(req: AuthedRequest, res: Response, listingId: string) {
  const listing = await findListingById(listingId);
  if (!listing || listing.seller_id !== req.userId) {
    res.status(404).json({ error: "Listing not found" });
    return null;
  }
  return listing;
}

function verificationPayload(user: Awaited<ReturnType<typeof findUserById>>, latest: Awaited<ReturnType<typeof findLatestSellerVerificationByUserId>>) {
  const rawStatus = user?.verification_status ?? "unverified";
  const verificationStatus =
    rawStatus === "pending" && !latest ? "unverified" : rawStatus;
  return {
    verificationStatus,
    user: user ? toPublicUser(user) : null,
    latestSubmission: latest
      ? {
          id: latest.id,
          status: latest.status,
          selfieUrl: latest.selfie_url,
          idDocumentUrl: latest.id_document_url,
          notes: latest.notes,
          rejectionReason: latest.rejection_reason,
          submittedAt: latest.submitted_at,
        }
      : null,
  };
}

sellerRouter.get("/verification", requireUserAuth, async (req: AuthedRequest, res) => {
  const user = await findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (!isSellerUser(user)) {
    res.status(403).json({ error: "Seller account required" });
    return;
  }

  const latest = await findLatestSellerVerificationByUserId(req.userId!);
  res.json(verificationPayload(user, latest));
});

sellerRouter.post(
  "/verification/upload",
  requireUserAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Invalid upload" });
        return;
      }
      next();
    });
  },
  async (req: AuthedRequest, res) => {
    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!isSellerUser(user)) {
      res.status(403).json({ error: "Seller account required" });
      return;
    }

    const kindRaw = typeof req.body.kind === "string" ? req.body.kind : "";
    const kind = kindRaw === "selfie" ? "selfie" : kindRaw === "id" ? "id" : null;
    if (!kind) {
      res.status(400).json({ error: "kind must be id or selfie" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image uploaded" });
      return;
    }

    try {
      const url = await uploadVerificationImage(req.userId!, kind, file.buffer, file.mimetype);
      res.json({ url, kind });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Could not upload document" });
    }
  },
);

sellerRouter.post("/verification/submit", requireUserAuth, async (req: AuthedRequest, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const userId = req.userId!;
  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (!isSellerUser(user)) {
    res.status(403).json({ error: "Seller account required" });
    return;
  }
  if (user.verification_status === "pending") {
    const existingSubmission = await findLatestSellerVerificationByUserId(userId);
    if (existingSubmission?.status === "pending") {
      res.status(409).json({ error: "Verification already pending review" });
      return;
    }
  }
  if (user.verification_status === "verified") {
    res.status(409).json({ error: "Your account is already verified" });
    return;
  }

  try {
    await createSellerVerification({
      user: [userId],
      status: "pending",
      selfie_url: parsed.data.selfieUrl,
      id_document_url: parsed.data.idDocumentUrl,
      notes: parsed.data.notes ?? "",
      submitted_at: new Date().toISOString(),
    });

    await updateUser(userId, {
      verification_status: "pending",
      seller_legal_name: parsed.data.legalName,
      seller_id_number: parsed.data.idNumber,
      seller_phone: parsed.data.phone,
    });
    await notifySellerVerificationSubmitted(userId);

    const updated = await findUserById(userId);
    const latest = await findLatestSellerVerificationByUserId(userId);

    res.status(201).json({
      ok: true,
      message: "Your verification may take up to 24 hours",
      ...verificationPayload(updated, latest),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not submit verification" });
  }
});

sellerRouter.post(
  "/listings/upload",
  requireUserAuth,
  (req, res, next) => {
    listingUpload.array("files", MAX_LISTING_IMAGES)(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Invalid upload" });
        return;
      }
      next();
    });
  },
  async (req: AuthedRequest, res) => {
    const user = await requireSellerAccount(req, res);
    if (!user) return;

    const files = req.files;
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "No images uploaded" });
      return;
    }

    try {
      const urls = await Promise.all(
        files.map((file, index) =>
          uploadListingImage(req.userId!, file.buffer, file.mimetype, index),
        ),
      );
      res.json({ urls });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Could not upload images" });
    }
  },
);

sellerRouter.get("/listings", requireUserAuth, async (req: AuthedRequest, res) => {
  const user = await requireSellerAccount(req, res);
  if (!user) return;

  try {
    const rows = await listListingsBySeller(req.userId!);
    res.json({ listings: rows.map((row) => toSellerListing(row)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your listings" });
  }
});

sellerRouter.get("/listings/:id", requireUserAuth, async (req: AuthedRequest, res) => {
  const user = await requireSellerAccount(req, res);
  if (!user) return;

  const listing = await requireOwnedListing(req, res, String(req.params.id));
  if (!listing) return;

  res.json({ listing: toSellerListing(listing) });
});

sellerRouter.patch("/listings/:id", requireUserAuth, async (req: AuthedRequest, res) => {
  const user = await requireSellerAccount(req, res);
  if (!user) return;

  const parsed = updateListingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const listing = await requireOwnedListing(req, res, String(req.params.id));
  if (!listing) return;
  if (listing.status === "deleted") {
    res.status(410).json({ error: "Listing has been deleted" });
    return;
  }

  const data = parsed.data;
  if (!Object.keys(data).length) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const effectiveType = data.listing_type ?? listing.listing_type;
  if (data.price != null && !isPriceWithinRange(data.price, effectiveType)) {
    res.status(400).json({ error: priceRangeError(effectiveType) });
    return;
  }

  try {
    const fields: Record<string, unknown> = {};
    if (data.title != null) fields.title = data.title;
    if (data.description != null) fields.description = data.description;
    if (data.listing_type != null) fields.listing_type = data.listing_type;
    if (data.price != null) fields.price = data.price;
    if (data.currency != null) fields.currency = data.currency.toUpperCase();
    if (data.city != null) fields.city = data.city;
    if (data.address != null) fields.address = data.address;
    if (data.area != null) fields.area = data.area;
    if (data.area_unit != null) fields.area_unit = data.area_unit;
    if (data.bedrooms != null) fields.bedrooms = data.bedrooms;
    if (data.bathrooms != null) fields.bathrooms = data.bathrooms;
    if (data.image_urls != null) fields.image_urls = JSON.stringify(data.image_urls);

    const updated = await updateListing(listing.id, fields as Parameters<typeof updateListing>[1]);
    res.json({ listing: toSellerListing(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update listing" });
  }
});

sellerRouter.patch("/listings/:id/status", requireUserAuth, async (req: AuthedRequest, res) => {
  const user = await requireSellerAccount(req, res);
  if (!user) return;

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const listing = await requireOwnedListing(req, res, String(req.params.id));
  if (!listing) return;

  const nextStatus = parsed.data.status as SellerListingStatus;
  if (listing.status === "deleted" && nextStatus !== "deleted") {
    res.status(410).json({ error: "Listing has been deleted" });
    return;
  }

  try {
    const updated = await updateListing(listing.id, { status: nextStatus });
    res.json({ listing: toSellerListing(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update listing status" });
  }
});

sellerRouter.delete("/listings/:id", requireUserAuth, async (req: AuthedRequest, res) => {
  const user = await requireSellerAccount(req, res);
  if (!user) return;

  const listing = await requireOwnedListing(req, res, String(req.params.id));
  if (!listing) return;

  try {
    const updated = await updateListing(listing.id, { status: "deleted" });
    res.json({ listing: toSellerListing(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete listing" });
  }
});
