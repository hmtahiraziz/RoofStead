import { Router } from "express";
import { z } from "zod";
import { getAdminSession, loginAdmin, logoutAdmin, refreshAdminSession } from "../services/adminAuth.service";
import { AuthError } from "../services/auth.service";
import type { AuthedRequest } from "../middleware/auth";
import { requireAdminAuth } from "../middleware/auth";
import {
  findSellerVerificationById,
  findUserById,
  listAllListingsForAdmin,
  listPendingSellerVerifications,
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
  adminId: string | undefined,
  rejectionReason?: string,
) {
  if (verificationId && verificationId !== userId) {
    try {
      await updateSellerVerification(verificationId, {
        status: decision === "approved" ? "approved" : "rejected",
        ...(decision === "rejected" ? { rejection_reason: rejectionReason } : {}),
        reviewed_at: new Date().toISOString(),
        ...(adminId ? { reviewed_by: [adminId] } : {}),
      });
    } catch (err) {
      console.warn("[admin] SellerVerifications row not updated:", err);
    }
  }
}

adminAuthRouter.get("/verifications", requireAdminAuth, async (_req, res) => {
  try {
    const sellerRows = await listPendingSellerVerifications();
    const verifications = await Promise.all(
      sellerRows.map(async (sellerRow) => {
        const user = await findUserById(sellerRow.user_id);
        return {
          id: sellerRow.id,
          userId: sellerRow.user_id,
          userName: user?.name ?? "Unknown seller",
          userEmail: user?.email ?? "—",
          userAvatarUrl: user?.profile_picture_url,
          legalName: user?.seller_legal_name,
          idNumber: user?.seller_id_number,
          phone: user?.seller_phone,
          selfieUrl: sellerRow.selfie_url,
          idDocumentUrl: sellerRow.id_document_url,
          submittedAt: sellerRow.submitted_at,
          notes: sellerRow.notes,
        };
      }),
    );
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
  const verification = await findSellerVerificationById(verificationId);
  if (!verification) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  const user = await findUserById(verification.user_id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    verification: {
      id: verification.id,
      status: verification.status,
      selfieUrl: verification.selfie_url,
      idDocumentUrl: verification.id_document_url,
      notes: verification.notes,
      rejectionReason: verification.rejection_reason,
      submittedAt: verification.submitted_at,
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
  const verification = await findSellerVerificationById(verificationId);
  if (!verification || verification.user_id !== userId) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }

  try {
    if (parsed.data.status === "approved") {
      await applySellerVerificationDecision(verificationId, userId, "approved", req.adminId);
      await updateUser(userId, { verification_status: "verified" });
      await notifySellerVerificationApproved(userId);
    } else {
      const reason = parsed.data.rejectionReason?.trim() || "Documentation did not meet requirements.";
      await applySellerVerificationDecision(verificationId, userId, "rejected", req.adminId, reason);
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
        listingType: l.listing_type,
        price: l.price,
        currency: l.currency,
        status: l.status,
        sellerId: l.seller_id,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
      })),
      total: listings.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load listings from Airtable" });
  }
});

adminAuthRouter.get("/users/:userId", requireAdminAuth, async (req, res) => {
  const user = await findUserById(String(req.params.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    email_verified: user.email_verified,
    verification_status: user.verification_status,
    is_active: user.is_active,
    is_deleted: user.is_deleted,
  });
});
