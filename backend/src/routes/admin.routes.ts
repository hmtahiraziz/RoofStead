import { Router } from "express";
import { z } from "zod";
import { getAdminSession, loginAdmin, logoutAdmin, refreshAdminSession } from "../services/adminAuth.service";
import { AuthError } from "../services/auth.service";
import type { AuthedRequest } from "../middleware/auth";
import { requireAdminAuth } from "../middleware/auth";
import {
  findListingById,
  findSellerVerificationById,
  findUserById,
  listAllListingsForAdmin,
  listListingsBySeller,
  listPendingVerificationsForAdmin,
  listSellerVerificationsByUserId,
  listUsersForAdmin,
  updateSellerVerification,
  updateUser,
} from "../lib/airtable/repositories";

import {
  notifySellerVerificationApproved,
  notifySellerVerificationRejected,
} from "../services/auth.service";
import { isAirtableNotAuthorized, isAirtableUnknownField, SELLER_VERIFICATIONS_FIELDS_HINT, SELLER_VERIFICATIONS_SETUP_HINT } from "../lib/airtable/errors";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const result = await loginAdmin(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Admin login failed" });
  }
});

adminAuthRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const result = await refreshAdminSession(parsed.data.refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Could not refresh admin session" });
  }
});

adminAuthRouter.post("/logout", requireAdminAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await logoutAdmin(req.adminId!);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Logout failed" });
  }
});

adminAuthRouter.get("/me", requireAdminAuth, async (req: AuthedRequest, res) => {
  const admin = await getAdminSession(req.adminId!);
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  res.json(admin);
});

const decisionSchema = z.object({
  rejectionReason: z.string().optional(),
  userId: z.string().optional(),
});

async function applySellerVerificationDecision(
  verificationId: string,
  userId: string,
  decision: "approved" | "rejected",
  _adminId: string | undefined,
  rejectionReason?: string,
) {
  if (!verificationId || verificationId === userId) return;

  await updateSellerVerification(verificationId, {
    status: decision === "approved" ? "approved" : "rejected",
    ...(decision === "rejected" ? { rejection_reason: rejectionReason } : {}),
    reviewed_at: new Date().toISOString(),
    // reviewed_by omitted — not all Airtable bases have this column
  });
}

adminAuthRouter.get("/verifications", requireAdminAuth, async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const queue = await listPendingVerificationsForAdmin();
    const verifications = queue.map(({ verificationId, user, submission }) => ({
      id: verificationId,
      userId: user.id,
      userName: user.name ?? "Unknown seller",
      userEmail: user.email ?? "—",
      userAvatarUrl: user.profile_picture_url,
      legalName: user.seller_legal_name,
      idNumber: user.seller_id_number,
      phone: user.seller_phone,
      selfieUrl: submission?.selfie_url,
      idDocumentUrl: submission?.id_document_url,
      submittedAt: submission?.submitted_at,
      notes: submission?.notes,
      hasSubmission: Boolean(submission),
    }));
    res.json({ verifications, total: verifications.length });
  } catch (err) {
    console.error(err);
    if (isAirtableNotAuthorized(err)) {
      res.status(200).json({
        verifications: [],
        total: 0,
        warning: SELLER_VERIFICATIONS_SETUP_HINT,
      });
      return;
    }
    if (isAirtableUnknownField(err)) {
      res.status(200).json({
        verifications: [],
        total: 0,
        warning: SELLER_VERIFICATIONS_FIELDS_HINT,
      });
      return;
    }
    res.status(500).json({ error: "Could not load verification queue" });
  }
});

adminAuthRouter.get("/verifications/:verificationId", requireAdminAuth, async (req, res) => {
  const verificationId = String(req.params.verificationId);
  let verification = await findSellerVerificationById(verificationId);
  let user = verification?.user_id
    ? await findUserById(verification.user_id)
    : await findUserById(verificationId);

  if (!user) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  if (!verification) {
    if (user.verification_status && user.verification_status !== "pending") {
      res.status(404).json({ error: "Verification not found" });
      return;
    }
    const submissions = await listSellerVerificationsByUserId(user.id);
    verification = submissions.find((s) => s.status === "pending") ?? submissions[0] ?? null;
  }

  const history = await listSellerVerificationsByUserId(user.id);
  const activeId = verification?.id ?? user.id;
  const priorRejections = history.filter((h) => h.id !== activeId && h.status === "rejected");

  res.json({
    verification: {
      id: activeId,
      status: verification?.status ?? user.verification_status ?? "pending",
      selfieUrl: verification?.selfie_url,
      idDocumentUrl: verification?.id_document_url,
      notes: verification?.notes,
      rejectionReason: verification?.rejection_reason,
      submittedAt: verification?.submitted_at,
      hasSubmission: Boolean(verification),
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.profile_picture_url,
      verificationStatus: user.verification_status,
      role: user.role,
      legalName: user.seller_legal_name,
      idNumber: user.seller_id_number,
      phone: user.seller_phone,
    },
    priorRejections: priorRejections.map((h) => ({
      id: h.id,
      rejectionReason: h.rejection_reason,
      submittedAt: h.submitted_at,
      reviewedAt: h.reviewed_at,
    })),
  });
});

const statusUpdateSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

adminAuthRouter.patch("/verifications/:verificationId/status", requireAdminAuth, async (req: AuthedRequest, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const verificationId = String(req.params.verificationId);
  const userId = parsed.data.userId;
  let verification = await findSellerVerificationById(verificationId);
  const user = await findUserById(userId);

  if (!user || user.id !== userId) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  if (verification && verification.user_id !== userId) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  if (verification) {
    if (verification.status !== "pending") {
      res.status(409).json({ error: "This verification has already been reviewed" });
      return;
    }
  } else if (user.verification_status !== "pending") {
    res.status(409).json({ error: "This verification has already been reviewed" });
    return;
  }

  try {
    if (parsed.data.status === "approved") {
      if (verification) {
        await applySellerVerificationDecision(verification.id, userId, "approved", req.adminId);
      }
      await updateUser(userId, { verification_status: "verified" });
      await notifySellerVerificationApproved(userId);
    } else {
      const reason = parsed.data.rejectionReason?.trim() || "Documentation did not meet requirements.";
      if (verification) {
        await applySellerVerificationDecision(verification.id, userId, "rejected", req.adminId, reason);
      }
      await updateUser(userId, { verification_status: "rejected" });
      await notifySellerVerificationRejected(userId, reason);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update verification status" });
  }
});

const approveBodySchema = z.object({
  userId: z.string().min(1),
});

adminAuthRouter.post(
  "/verifications/:verificationId/approve",
  requireAdminAuth,
  async (req: AuthedRequest, res) => {
    const verificationId = String(req.params.verificationId);
    const parsed = approveBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const userId = parsed.data.userId;
    try {
      await applySellerVerificationDecision(
        verificationId,
        userId,
        "approved",
        req.adminId,
      );
      await updateUser(userId, { verification_status: "verified" });
      await notifySellerVerificationApproved(userId);

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Could not approve verification" });
    }
  },
);

adminAuthRouter.post(
  "/verifications/:verificationId/reject",
  requireAdminAuth,
  async (req: AuthedRequest, res) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.userId?.trim()) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const reason = parsed.data.rejectionReason?.trim() || "Documentation did not meet requirements.";
    const verificationId = String(req.params.verificationId);
    const userId = parsed.data.userId.trim();

    try {
      await applySellerVerificationDecision(
        verificationId,
        userId,
        "rejected",
        req.adminId,
        reason,
      );
      await updateUser(userId, { verification_status: "rejected" });
      await notifySellerVerificationRejected(userId, reason);

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Could not reject verification" });
    }
  },
);

adminAuthRouter.get("/users", requireAdminAuth, async (_req, res) => {
  try {
    const users = await listUsersForAdmin();
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role ?? (u.intends_seller ? "seller" : "buyer"),
        profile_picture_url: u.profile_picture_url,
        email_verified: u.email_verified,
        verification_status: u.verification_status,
        intends_seller: u.intends_seller,
        is_active: u.is_active,
        is_deleted: u.is_deleted,
      })),
      total: users.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load users from Airtable" });
  }
});

adminAuthRouter.get("/listings", requireAdminAuth, async (_req, res) => {
  try {
    const listings = await listAllListingsForAdmin();
    res.json({
      listings: listings.map((l) => ({
        id: l.id,
        title: l.title,
        city: l.city,
        address: l.address,
        listingType: l.listing_type,
        price: l.price,
        currency: l.currency,
        sellerId: l.seller_id,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        imageUrl: l.image_urls[0],
      })),
      total: listings.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load listings from Airtable" });
  }
});

adminAuthRouter.get("/listings/:listingId", requireAdminAuth, async (req, res) => {
  const listingId = String(req.params.listingId);
  const listing = await findListingById(listingId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const seller = await findUserById(listing.seller_id);

  res.json({
    listing: {
      id: listing.id,
      title: listing.title,
      description: listing.description ?? "",
      city: listing.city,
      address: listing.address ?? "",
      listingType: listing.listing_type,
      price: listing.price,
      currency: listing.currency,
      status: listing.status,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      area: listing.area,
      areaUnit: listing.area_unit,
      imageUrls: listing.image_urls,
      imageUrl: listing.image_urls[0],
      sellerId: listing.seller_id,
    },
    seller: seller
      ? {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          avatarUrl: seller.profile_picture_url,
          verificationStatus: seller.verification_status,
          role: seller.role,
        }
      : null,
  });
});

adminAuthRouter.get("/users/:userId", requireAdminAuth, async (req, res) => {
  const userId = String(req.params.userId);
  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [listings, verificationHistory] = await Promise.all([
    listListingsBySeller(userId),
    listSellerVerificationsByUserId(userId),
  ]);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? (user.intends_seller ? "seller" : "buyer"),
      profile_picture_url: user.profile_picture_url,
      email_verified: user.email_verified,
      verification_status: user.verification_status,
      intends_seller: user.intends_seller,
      is_active: user.is_active,
      is_deleted: user.is_deleted,
      seller_phone: user.seller_phone,
      seller_id_number: user.seller_id_number,
      seller_legal_name: user.seller_legal_name,
    },
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      city: l.city,
      address: l.address,
      listingType: l.listing_type,
      price: l.price,
      currency: l.currency,
      status: l.status,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      imageUrl: l.image_urls[0],
    })),
    verificationHistory: verificationHistory.map((v) => ({
      id: v.id,
      status: v.status,
      selfieUrl: v.selfie_url,
      idDocumentUrl: v.id_document_url,
      notes: v.notes,
      rejectionReason: v.rejection_reason,
      submittedAt: v.submitted_at,
      reviewedAt: v.reviewed_at,
    })),
  });
});
