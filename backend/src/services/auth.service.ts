import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  type UserRecord,
} from "../lib/airtable/repositories";
import { toPublicUser } from "../lib/auth/publicUser";
import { sendTemplateMail } from "../lib/mail/send";
import { env } from "../config/env";
import {
  buildPasswordResetUrl,
  hashPassword,
  PASSWORD_RESET_TTL_HOURS,
  signPasswordResetToken,
  signUserAccessToken,
  verifyPassword,
  verifyPasswordResetToken,
} from "../lib/auth/tokens";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}

function isAirtableUnknownFieldError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Unknown field name") || message.includes("UNKNOWN_FIELD_NAME");
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  intendsSeller?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const password_hash = await hashPassword(input.password);

  const user = await createUser({
    email,
    password_hash,
    name: input.name.trim(),
    email_verified: true,
    verification_status: "pending",
  });

  const token = signUserAccessToken(user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token,
    user: toPublicUser(user),
    message: "Account created successfully.",
  };
}

export async function updateUserProfile(
  userId: string,
  input: { name?: string; profile_picture_url?: string },
): Promise<UserRecord> {
  const user = await findUserById(userId);
  if (!user) throw new AuthError("User not found", 404);

  const fields: Record<string, unknown> = {};
  if (input.name?.trim()) fields.name = input.name.trim();
  if (input.profile_picture_url) fields.profile_picture_url = input.profile_picture_url;

  if (!Object.keys(fields).length) {
    throw new AuthError("Nothing to update", 400);
  }

  try {
    return await updateUser(userId, fields as Parameters<typeof updateUser>[1]);
  } catch (err) {
    if (input.profile_picture_url && isAirtableUnknownFieldError(err)) {
      console.warn(
        "[profile] Add a URL field “Profile Picture URL” on Users in Airtable to persist avatars. Using uploaded URL for this account in-app only.",
      );
      let current = user;
      if (fields.name) {
        try {
          current = await updateUser(userId, { name: fields.name as string });
        } catch {
          /* name-only update failed; keep loaded user */
        }
      }
      return { ...current, profile_picture_url: input.profile_picture_url };
    }
    throw err;
  }
}

export async function changeUserPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<{ message: string }> {
  const user = await findUserById(userId);
  if (!user) throw new AuthError("User not found", 404);
  if (user.is_deleted) throw new AuthError("Account has been deleted", 403);
  if (!user.is_active) throw new AuthError("Account is deactivated", 403);

  if (!user.password_hash) {
    throw new AuthError(
      "This account has no password set. Use “Forgot password” on the sign-in page to create one.",
      400,
    );
  }

  const currentOk = await verifyPassword(input.currentPassword, user.password_hash);
  if (!currentOk) throw new AuthError("Current password is incorrect", 401);

  if (input.newPassword === input.currentPassword) {
    throw new AuthError("New password must be different from your current password", 400);
  }

  const password_hash = await hashPassword(input.newPassword);
  await updateUser(userId, { password_hash });

  return { message: "Password updated successfully." };
}

const PASSWORD_RESET_ACK =
  "If an account exists for that email, we sent instructions to reset your password.";

export async function requestPasswordReset(email: string): Promise<{
  message: string;
  devResetUrl?: string;
}> {
  const normalized = email.trim().toLowerCase();
  const user = await findUserByEmail(normalized);

  if (!user || user.is_deleted || !user.is_active) {
    return { message: PASSWORD_RESET_ACK };
  }

  const token = signPasswordResetToken(user.id);
  const resetUrl = buildPasswordResetUrl(token);

  if (env.mailEnabled) {
    await sendTemplateMail(user.email, "password_reset", {
      name: user.name,
      resetUrl,
      expiresHours: PASSWORD_RESET_TTL_HOURS,
    });
    return { message: PASSWORD_RESET_ACK };
  }

  if (env.nodeEnv !== "production") {
    console.info(`[password-reset] ${resetUrl}`);
    return { message: PASSWORD_RESET_ACK, devResetUrl: resetUrl };
  }

  return { message: PASSWORD_RESET_ACK };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  let userId: string;
  try {
    userId = verifyPasswordResetToken(token).sub;
  } catch {
    throw new AuthError("This reset link is invalid or has expired.", 400);
  }

  const user = await findUserById(userId);
  if (!user || user.is_deleted || !user.is_active) {
    throw new AuthError("This reset link is invalid or has expired.", 400);
  }

  const password_hash = await hashPassword(newPassword);
  await updateUser(userId, { password_hash });

  return { message: "Password reset successfully. You can sign in with your new password." };
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) throw new AuthError("Invalid email or password", 401);

  if (user.is_deleted) throw new AuthError("Account has been deleted", 403);
  if (!user.is_active) throw new AuthError("Account is deactivated", 403);
  if (!user.password_hash) {
    throw new AuthError(
      "This account has no password set in Airtable. Sign up again or set password_hash on the Users record.",
      401,
    );
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new AuthError("Invalid email or password", 401);

  const token = signUserAccessToken(user.id);
  return {
    token,
    user: toPublicUser(user),
  };
}

export async function notifySellerVerificationSubmitted(_userId: string) {
  /* transactional mail disabled unless MAIL_ENABLED=true */
}

export async function notifySellerVerificationApproved(_userId: string) {
  /* transactional mail disabled unless MAIL_ENABLED=true */
}

export async function notifySellerVerificationRejected(_userId: string, _reason: string) {
  /* transactional mail disabled unless MAIL_ENABLED=true */
}
