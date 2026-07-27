"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRedirectIfAuthenticated } from "@/components/auth/useRedirect";
import { apiFetch } from "@/lib/api/client";
import { authRedirectPath } from "@/lib/auth/routing";
import type { StoredUser } from "@/lib/auth/session";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type LoginResponse = {
  token: string;
  refreshToken: string;
  user: StoredUser;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { loading: authLoading, redirecting } = useRedirectIfAuthenticated();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      login(data.token, data.refreshToken, data.user);
      router.push(authRedirectPath(data.user, searchParams.get("returnTo")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || redirecting) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center text-on-surface-variant">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="bg-surface font-body-lg text-on-surface min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
      <main className="flex-grow flex items-center justify-center px-margin-mobile py-12">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl ambient-shadow p-8 md:p-10 border border-outline-variant/30 flex flex-col items-center">
          <div className="mb-10 text-center">
            <Image
              alt="RoofStead"
              className="h-16 w-auto mx-auto mb-6"
              height={64}
              src={STITCH_LOGO_SRC}
              style={{ width: "auto", height: "auto", maxHeight: "4rem" }}
              width={160}
              priority
            />
            <h1 className="font-headline-md text-headline-md text-primary mb-2">Welcome back</h1>
            <p className="font-body-md text-on-surface-variant">
              Access favorites, messages, and your seller dashboard.
            </p>
          </div>

          <form className="w-full space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                  mail
                </span>
                <input
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md text-on-surface form-input-focus transition-all placeholder:text-outline-variant"
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider"
                  htmlFor="password"
                >
                  Password
                </label>
                <Link
                  className="font-label-md text-primary hover:underline text-[12px] normal-case tracking-normal"
                  href="/auth/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                  lock
                </span>
                <input
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md text-on-surface form-input-focus transition-all placeholder:text-outline-variant"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>

            {error && <p className="text-error text-sm font-body-md">{error}</p>}

            <button
              className="w-full bg-primary text-on-primary font-title-lg text-title-lg py-4 rounded-lg hover:bg-primary-container active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-2 group disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? "Signing in…" : "Sign In"}</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </form>

          <div className="w-full flex items-center gap-4 my-8">
            <div className="h-px flex-grow bg-outline-variant/50" />
            <span className="font-label-md text-on-surface-variant">OR</span>
            <div className="h-px flex-grow bg-outline-variant/50" />
          </div>

          <div className="text-center">
            <p className="font-body-md text-on-surface-variant">
              New here?{" "}
              <Link className="text-primary font-bold hover:underline ml-1" href="/auth/signup">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
