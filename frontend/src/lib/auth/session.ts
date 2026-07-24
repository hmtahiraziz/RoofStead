export const USER_TOKEN_KEY = "roofstead_user_token";
export const USER_REFRESH_TOKEN_KEY = "roofstead_user_refresh_token";
export const USER_PROFILE_KEY = "roofstead_user_profile";

export type UserRole = "buyer" | "seller";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
  profile_picture_url?: string;
  verification_status?: string;
  intends_seller?: boolean;
};

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function getUserRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_REFRESH_TOKEN_KEY);
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

export function persistUserSession(token: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem(USER_TOKEN_KEY, token);
  localStorage.setItem(USER_REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
}

export function clearUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
}

export const ADMIN_TOKEN_KEY = "roofstead_admin_token";
export const ADMIN_REFRESH_TOKEN_KEY = "roofstead_admin_refresh_token";
export const ADMIN_PROFILE_KEY = "roofstead_admin_profile";

export type StoredAdmin = {
  id: string;
  email: string;
  name: string;
  role?: string;
};

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
}

export function getStoredAdmin(): StoredAdmin | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAdmin;
  } catch {
    return null;
  }
}

export function persistAdminSession(token: string, refreshToken: string, admin: StoredAdmin) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin));
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
}
