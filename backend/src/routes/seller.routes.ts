import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserAuth } from "../middleware/auth";
import {
  createSellerVerification,
  findUserById,
  updateUser,
} from "../lib/airtable/repositories";
import { notifySellerVerificationSubmitted } from "../services/auth.service";

const submitSchema = z.object({
  selfieUrl: z.string().url(),
  idDocumentUrl: z.string().url(),
  notes: z.string().max(2000).optional(),
});

export const sellerRouter = Router();

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
  if (!user.intends_seller) {
    res.status(403).json({ error: "Seller path not enabled for this account" });
    return;
  }
  if (user.verification_status === "pending") {
    res.status(409).json({ error: "Verification already pending review" });
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

    await updateUser(userId, { verification_status: "pending" });
    await notifySellerVerificationSubmitted(userId);

    res.status(201).json({
      ok: true,
      message: "Your verification may take up to 24 hours",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not submit verification" });
  }
});
