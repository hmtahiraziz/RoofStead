"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Missing reset token. Request a new link from the forgot password page.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setMessage(res.message);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface font-body-lg text-on-surface min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center px-margin-mobile py-12">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl ambient-shadow p-8 md:p-10 border border-outline-variant/30">
          <div className="mb-8 text-center">
            <Image
              alt="RoofStead"
              className="h-14 w-auto mx-auto mb-6"
              height={56}
              src={STITCH_LOGO_SRC}
              style={{ width: "auto", height: "auto", maxHeight: "3.5rem" }}
              width={140}
              priority
            />
            <h1 className="font-headline-md text-headline-md text-primary mb-2">Choose a new password</h1>
            <p className="font-body-md text-on-surface-variant">Enter and confirm your new password below.</p>
          </div>

          {!token && (
            <p className="text-error text-sm mb-4">
              This link is invalid.{" "}
              <Link className="underline" href="/auth/forgot-password">
                Request a new reset link
              </Link>
              .
            </p>
          )}

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="font-label-md text-on-surface-variant uppercase tracking-wider block" htmlFor="new-password">
                New password
              </label>
              <input
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-outline-variant rounded-lg form-input-focus bg-transparent"
                id="new-password"
                minLength={8}
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label
                className="font-label-md text-on-surface-variant uppercase tracking-wider block"
                htmlFor="confirm-password"
              >
                Confirm password
              </label>
              <input
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-outline-variant rounded-lg form-input-focus bg-transparent"
                id="confirm-password"
                minLength={8}
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-error text-sm">{error}</p>}
            {message && <p className="text-primary text-sm">{message}</p>}

            <button
              className="w-full bg-primary text-on-primary font-title-lg py-4 rounded-lg disabled:opacity-60"
              disabled={loading || !token}
              type="submit"
            >
              {loading ? "Saving…" : "Reset password"}
            </button>
          </form>

          <p className="mt-8 text-center font-body-md text-on-surface-variant">
            <Link className="text-primary font-bold hover:underline" href="/auth/login">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
