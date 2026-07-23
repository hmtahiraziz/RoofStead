import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

const EMAIL_VERIFY_TTL_HOURS = 48;
const ACCESS_TOKEN_TTL = "7d";
const ADMIN_TOKEN_TTL = "12h";

export type UserTokenPayload = {
  sub: string;
  type: "user";
};

export type AdminTokenPayload = {
  sub: string;
  type: "admin";
  role: string;
};

export type EmailVerifyPayload = {
  sub: string;
  type: "email_verify";
};

export type PasswordResetPayload = {
  sub: string;
  type: "password_reset";
};

const PASSWORD_RESET_TTL_HOURS = 1;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signEmailVerificationToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "email_verify" } satisfies EmailVerifyPayload, env.jwtEmailVerifySecret, {
    expiresIn: `${EMAIL_VERIFY_TTL_HOURS}h`,
  });
}

export function verifyEmailVerificationToken(token: string): EmailVerifyPayload {
  const payload = jwt.verify(token, env.jwtEmailVerifySecret) as EmailVerifyPayload;
  if (payload.type !== "email_verify") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function signUserAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "user" } satisfies UserTokenPayload, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function signAdminAccessToken(adminId: string, role: string): string {
  return jwt.sign(
    { sub: adminId, type: "admin", role } satisfies AdminTokenPayload,
    env.jwtAdminSecret,
    { expiresIn: ADMIN_TOKEN_TTL },
  );
}

export function verifyUserAccessToken(token: string): UserTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret) as UserTokenPayload;
  if (payload.type !== "user") throw new Error("Invalid token type");
  return payload;
}

export function verifyAdminAccessToken(token: string): AdminTokenPayload {
  const payload = jwt.verify(token, env.jwtAdminSecret) as AdminTokenPayload;
  if (payload.type !== "admin") throw new Error("Invalid token type");
  return payload;
}

export function getEmailVerifyExpiresAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + EMAIL_VERIFY_TTL_HOURS);
  return d.toISOString();
}

export function buildEmailVerifyUrl(token: string): string {
  return `${env.apiPublicUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export function signPasswordResetToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "password_reset" } satisfies PasswordResetPayload, env.jwtSecret, {
    expiresIn: `${PASSWORD_RESET_TTL_HOURS}h`,
  });
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload {
  const payload = jwt.verify(token, env.jwtSecret) as PasswordResetPayload;
  if (payload.type !== "password_reset") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function buildPasswordResetUrl(token: string): string {
  return `${env.appPublicUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export { EMAIL_VERIFY_TTL_HOURS, PASSWORD_RESET_TTL_HOURS };
