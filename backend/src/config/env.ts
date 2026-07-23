import dotenv from "dotenv";

dotenv.config();

function required(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV !== "production" && devFallback !== undefined) {
    return devFallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  jwtSecret: required("JWT_SECRET", "dev-user-jwt-secret"),
  jwtAdminSecret: required("JWT_ADMIN_SECRET", "dev-admin-jwt-secret"),
  jwtEmailVerifySecret: required("JWT_EMAIL_VERIFY_SECRET", "dev-email-verify-secret"),
  airtable: {
    apiKey: required("AIRTABLE_API_KEY", ""),
    baseId: required("AIRTABLE_BASE_ID", ""),
  },
  cloudinary: {
    cloudName: required("CLOUDINARY_CLOUD_NAME", ""),
    apiKey: required("CLOUDINARY_API_KEY", ""),
    apiSecret: required("CLOUDINARY_API_SECRET", ""),
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? "roofstead",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
  },
  appName: process.env.APP_NAME ?? "RoofStead",
  appPublicUrl: process.env.APP_PUBLIC_URL ?? "http://localhost:3000",
  apiPublicUrl: process.env.API_PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  /** Set MAIL_ENABLED=true to send transactional email (off by default). */
  mailEnabled: process.env.MAIL_ENABLED === "true",
};
