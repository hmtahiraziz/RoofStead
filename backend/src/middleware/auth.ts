import type { NextFunction, Request, Response } from "express";
import { verifyAdminAccessToken, verifyUserAccessToken } from "../lib/auth/tokens";
import { getAdminSession } from "../services/adminAuth.service";
import { findUserById } from "../lib/airtable/repositories";

export type AuthedRequest = Request & {
  userId?: string;
  adminId?: string;
  adminRole?: string;
};

export async function requireUserAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyUserAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user || user.is_deleted || !user.is_active) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireAdminAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  try {
    const payload = verifyAdminAccessToken(token);
    const admin = await getAdminSession(payload.sub);
    if (!admin) {
      res.status(401).json({ error: "Invalid admin session" });
      return;
    }
    req.adminId = admin.id;
    req.adminRole = admin.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
