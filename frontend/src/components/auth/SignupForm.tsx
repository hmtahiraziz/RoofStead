"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRedirectIfAuthenticated } from "@/components/auth/useRedirect";
import { apiFetch } from "@/lib/api/client";
import { postAuthRedirect } from "@/lib/auth/routing";
import type { StoredUser } from "@/lib/auth/session";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type RegisterResponse = {
  message: string;
  token: string;
  refreshToken: string;
  user: StoredUser;
};

export function SignupForm() {
  const router = useRouter();
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
      const res = await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("full-name"),
          email: form.get("email"),
          password: form.get("password"),
          intendsSeller: form.get("intends-seller") === "on",
        }),
      });
      login(res.token, res.refreshToken, res.user);
      router.push(postAuthRedirect(res.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
              width={160}
              priority
            />
            <h1 className="font-headline-md text-headline-md text-primary mb-2">Create your account</h1>
            <p className="font-body-md text-on-surface-variant">
              Experience a more transparent way to find home.
            </p>
          </div>

          <form className="w-full space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label
                  className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block"
                  htmlFor="full-name"
                >
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                    person
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md form-input-focus"
                    id="full-name"
                    name="full-name"
                    placeholder="John Doe"
                    required
                    type="text"
                  />
                </div>
              </div>
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
                    className="w-full pl-10 pr-4 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md form-input-focus"
                    id="email"
                    name="email"
                    placeholder="name@example.com"
                    required
                    type="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                    lock
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md form-input-focus"
                    id="password"
                    name="password"
                    minLength={8}
                    placeholder="••••••••"
                    required
                    type="password"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                <input id="intends-seller" name="intends-seller" type="checkbox" />
                I plan to list properties as a seller
              </label>
              {error && <p className="text-error text-sm">{error}</p>}
              <button
                className="w-full bg-primary text-on-primary font-title-lg py-4 rounded-lg hover:bg-primary-container transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? "Creating…" : "Create Account"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

          <div className="text-center mt-8">
            <p className="font-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link className="text-primary font-bold hover:underline" href="/auth/login">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
