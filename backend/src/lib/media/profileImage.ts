import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";

function cloudinaryCredentialsPresent(): boolean {
  return Boolean(
    env.cloudinary.cloudName?.trim() &&
      env.cloudinary.apiKey?.trim() &&
      env.cloudinary.apiSecret?.trim(),
  );
}

/** Use Cloudinary only when explicitly enabled (avoids dev hangs on bad creds). */
export function shouldUseCloudinaryUpload(): boolean {
  if (process.env.PROFILE_UPLOAD_LOCAL === "true") return false;
  if (env.nodeEnv === "development" && process.env.CLOUDINARY_UPLOAD !== "true") {
    return false;
  }
  return cloudinaryCredentialsPresent();
}

async function uploadToLocalDisk(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const dir = path.join(process.cwd(), "uploads", "profiles");
  await fs.mkdir(dir, { recursive: true });
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = `${userId}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${env.apiPublicUrl}/uploads/profiles/${filename}`;
}

function uploadToCloudinary(userId: string, buffer: Buffer, timeoutMs: number): Promise<string> {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });

  const uploadPromise = new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `${env.cloudinary.uploadFolder}/profiles`,
          public_id: userId.replace(/[^a-zA-Z0-9_-]/g, "_"),
          overwrite: true,
          resource_type: "image",
        },
        (err, res) => {
          if (err || !res?.secure_url) reject(err ?? new Error("Cloudinary upload failed"));
          else resolve(res.secure_url);
        },
      )
      .end(buffer);
  });

  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error("Cloudinary request timed out")), timeoutMs);
  });

  return Promise.race([uploadPromise, timeoutPromise]);
}

export async function uploadProfileImage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (shouldUseCloudinaryUpload()) {
    try {
      return await uploadToCloudinary(userId, buffer, 12_000);
    } catch (err) {
      console.warn("[profile] Cloudinary upload failed, using local storage:", err);
    }
  }

  return uploadToLocalDisk(userId, buffer, mimeType);
}
