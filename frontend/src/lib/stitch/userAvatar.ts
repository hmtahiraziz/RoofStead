import { STITCH_PROFILE_AVATAR_LARGE, STITCH_PROFILE_AVATAR_SMALL } from "@/lib/stitch/brand";

export function userAvatarSrc(profilePictureUrl?: string | null, size: "large" | "small" = "large"): string {
  if (profilePictureUrl?.trim()) return profilePictureUrl;
  return size === "small" ? STITCH_PROFILE_AVATAR_SMALL : STITCH_PROFILE_AVATAR_LARGE;
}
