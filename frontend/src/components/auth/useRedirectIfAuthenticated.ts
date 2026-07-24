"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authRedirectPath } from "@/lib/auth/routing";

export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    if (loading || !user) return;
    router.replace(authRedirectPath(user, returnTo));
  }, [loading, user, router, returnTo]);

  return { user, loading, redirecting: !loading && Boolean(user) };
}
