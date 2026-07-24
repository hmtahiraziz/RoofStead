"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { postAuthRedirect } from "@/lib/auth/routing";

export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(postAuthRedirect(user));
  }, [loading, user, router]);

  return { user, loading, redirecting: !loading && Boolean(user) };
}
