export const USER_TOKEN_KEY = "roofstead_user_token";
export const USER_PROFILE_KEY = "roofstead_user_profile";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  profile_picture_url?: string;
  verification_status?: string;
  intends_seller?: boolean;
};

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function persistUserSession(token: string, user: StoredUser) {
  localStorage.setItem(USER_TOKEN_KEY, token);
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
}

export function clearUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
}

export const ADMIN_TOKEN_KEY = "roofstead_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
