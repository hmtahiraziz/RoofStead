import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";
import { shouldUseCloudinaryUpload } from "./profileImage";

function fileExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function uploadToLocalDisk(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  index: number,
): Promise<string> {
  const dir = path.join(process.cwd(), "uploads", "listings", userId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  await fs.mkdir(dir, { recursive: true });
  const ext = fileExtension(mimeType);
  const filename = `${Date.now()}-${index}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${env.apiPublicUrl}/uploads/listings/${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}/${filename}`;
}

function uploadToCloudinary(
  userId: string,
  buffer: Buffer,
  index: number,
  timeoutMs: number,
): Promise<string> {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });

  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const uploadPromise = new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `${env.cloudinary.uploadFolder}/listings/${safeUserId}`,
          public_id: `${Date.now()}-${index}`,
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

export async function uploadListingImage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  index: number,
): Promise<string> {
  if (shouldUseCloudinaryUpload()) {
    try {
      return await uploadToCloudinary(userId, buffer, index, 12_000);
    } catch (err) {
      console.warn("[listings] Cloudinary upload failed, using local storage:", err);
    }
  }

  return uploadToLocalDisk(userId, buffer, mimeType, index);
}
