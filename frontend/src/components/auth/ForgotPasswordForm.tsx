"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type ForgotResponse = {
  message: string;
  devResetUrl?: string;
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    setLoading(true);
    try {
      const res = await apiFetch<ForgotResponse>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(res.message);
      if (res.devResetUrl) setDevResetUrl(res.devResetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
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
            <h1 className="font-headline-md text-headline-md text-primary mb-2">Reset password</h1>
            <p className="font-body-md text-on-surface-variant">
              Enter your account email and we will send a link to choose a new password.
            </p>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block"
                htmlFor="email"
              >
                Email address
              </label>
              <input
                autoComplete="email"
                className="w-full px-4 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md form-input-focus"
                id="email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-error text-sm">{error}</p>}
            {message && <p className="text-primary text-sm">{message}</p>}
            {devResetUrl && (
              <p className="text-[12px] text-on-surface-variant break-all bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                Development only:{" "}
                <Link className="text-primary underline" href={devResetUrl}>
                  open reset link
                </Link>
              </p>
            )}

            <button
              className="w-full bg-primary text-on-primary font-title-lg py-4 rounded-lg disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Sending…" : "Send reset link"}
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
