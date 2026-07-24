import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";
import { shouldUseCloudinaryUpload } from "./profileImage";

async function uploadToLocalDisk(
  userId: string,
  kind: "id" | "selfie",
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const dir = path.join(process.cwd(), "uploads", "verification");
  await fs.mkdir(dir, { recursive: true });
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = `${userId}-${kind}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${env.apiPublicUrl}/uploads/verification/${filename}`;
}

function uploadToCloudinary(
  userId: string,
  kind: "id" | "selfie",
  buffer: Buffer,
  timeoutMs: number,
): Promise<string> {
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
          folder: `${env.cloudinary.uploadFolder}/verification`,
          public_id: `${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}-${kind}`,
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

export async function uploadVerificationImage(
  userId: string,
  kind: "id" | "selfie",
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (shouldUseCloudinaryUpload()) {
    try {
      return await uploadToCloudinary(userId, kind, buffer, 12_000);
    } catch (err) {
      console.warn("[verification] Cloudinary upload failed, using local storage:", err);
    }
  }

  return uploadToLocalDisk(userId, kind, buffer, mimeType);
}
