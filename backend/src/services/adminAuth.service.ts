import {
  createAdminUser,
  findAdminByEmail,
  findAdminById,
  updateAdminUser,
  type AdminUserRecord,
} from "../lib/airtable/repositories";
import { isAirtableNetworkError } from "../lib/airtable/errors";
import { env } from "../config/env";
import { hashPassword, signAdminAccessToken, verifyPassword } from "../lib/auth/tokens";
import { AuthError } from "./auth.service";

/** JWT subject when dev login succeeds while Airtable is unreachable (development only). */
export const DEV_OFFLINE_ADMIN_ID = "dev-super-admin";

function devSuperAdminConfig() {
  return {
    email: (process.env.SUPER_ADMIN_EMAIL ?? "admin@roofstead.local").trim().toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe-SuperAdmin-123!",
    name: process.env.SUPER_ADMIN_NAME ?? "Super Admin",
  };
}

function offlineDevSuperAdminRecord(): AdminUserRecord {
  const { email, name } = devSuperAdminConfig();
  return {
    id: DEV_OFFLINE_ADMIN_ID,
    email,
    password_hash: "",
    name,
    role: "super_admin",
    is_active: true,
  };
}

function adminLoginPayload(admin: AdminUserRecord) {
  const role = admin.role ?? "admin";
  const token = signAdminAccessToken(admin.id, role);
  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role,
    },
  };
}

/** In development, accept SUPER_ADMIN_* from .env and sync Airtable so login always matches .env. */
async function syncDevSuperAdmin(email: string, password: string): Promise<AdminUserRecord | null> {
  if (env.nodeEnv === "production") return null;

  const { email: devEmail, password: devPassword } = devSuperAdminConfig();
  if (email !== devEmail || password !== devPassword) return null;

  const password_hash = await hashPassword(password);
  const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin";
  const existing = await findAdminByEmail(email);

  if (existing) {
    return updateAdminUser(existing.id, {
      password_hash,
      name,
      role: "super_admin",
      is_active: true,
    });
  }

  return createAdminUser({
    email,
    password_hash,
    name,
    role: "super_admin",
    is_active: true,
  });
}

function tryOfflineDevSuperAdminLogin(email: string, password: string): AdminUserRecord | null {
  if (env.nodeEnv === "production") return null;
  const { email: devEmail, password: devPassword } = devSuperAdminConfig();
  if (email !== devEmail || password !== devPassword) return null;
  console.warn(
    "[admin login] Airtable unreachable — signed in with SUPER_ADMIN_* from .env (offline dev mode). Fix DNS or use 8.8.8.8 / 1.1.1.1 for full admin features.",
  );
  return offlineDevSuperAdminRecord();
}

export async function loginAdmin(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  let admin: AdminUserRecord | null = null;

  try {
    admin = await findAdminByEmail(normalized);
  } catch (err) {
    if (isAirtableNetworkError(err)) {
      const offline = tryOfflineDevSuperAdminLogin(normalized, password);
      if (offline) return adminLoginPayload(offline);
      throw new AuthError(
        "Cannot reach Airtable (DNS/network). Fix internet or set Windows DNS to 1.1.1.1 / 8.8.8.8. In development, use SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD from backend/.env.",
        503,
      );
    }
    throw err;
  }

  if (admin?.is_active === false) {
    throw new AuthError("Admin account is deactivated", 403);
  }

  if (admin && (await verifyPassword(password, admin.password_hash))) {
    return adminLoginPayload(admin);
  }

  const synced = await syncDevSuperAdmin(normalized, password);
  if (synced) {
    return adminLoginPayload(synced);
  }

  if (!admin) {
    throw new AuthError(
      "Invalid admin email or password. Use your AdminUsers account or SUPER_ADMIN_* from backend/.env (run npm run seed:admin).",
      401,
    );
  }

  throw new AuthError("Invalid admin email or password", 401);
}

export async function getAdminSession(adminId: string) {
  if (env.nodeEnv !== "production" && adminId === DEV_OFFLINE_ADMIN_ID) {
    const { email, name } = devSuperAdminConfig();
    return {
      id: DEV_OFFLINE_ADMIN_ID,
      email,
      name,
      role: "super_admin" as const,
    };
  }

  const admin = await findAdminById(adminId);
  if (!admin || !admin.is_active) return null;
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role ?? "admin",
  };
}
