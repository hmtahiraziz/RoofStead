"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfilePageShell } from "@/components/profile/ProfilePageShell";
import { apiFetch, apiUpload } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import type { StoredUser } from "@/lib/auth/session";

const inputClass =
  "h-12 px-4 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary bg-surface-bright transition-all font-body-md w-full";

export function StitchSellerVerification() {
  const router = useRouter();
  const { user, token, applyProfile, refreshUser } = useAuth();
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !token) return null;

  if (!isSellerAccount(user)) {
    return (
      <ProfilePageShell>
        <div className="rounded-xl border border-outline-variant p-8 text-center">
          <p className="text-on-surface-variant mb-4">Seller verification is only available for seller accounts.</p>
          <Link className="text-primary font-label-md hover:underline" href="/listings">
            Browse properties
          </Link>
        </div>
      </ProfilePageShell>
    );
  }

  if (user.verification_status === "verified") {
    return (
      <ProfilePageShell>
        <div className="rounded-xl border border-primary/30 bg-primary-container/10 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-primary mb-4 block">verified</span>
          <h1 className="font-headline-sm text-headline-sm text-primary mb-2">You are verified</h1>
          <p className="text-on-surface-variant mb-6">Your seller identity has been approved.</p>
          <Link className="inline-flex bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md" href="/seller">
            Go to dashboard
          </Link>
        </div>
      </ProfilePageShell>
    );
  }

  if (user.verification_status === "pending") {
    return (
      <ProfilePageShell>
        <div className="rounded-xl border border-secondary-container bg-secondary-container/20 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">hourglass_top</span>
          <h1 className="font-headline-sm text-headline-sm text-primary mb-2">Verification under review</h1>
          <p className="text-on-surface-variant">
            Our team is reviewing your documents. This usually takes 24–48 business hours.
          </p>
        </div>
      </ProfilePageShell>
    );
  }

  async function uploadFile(file: File, kind: "id" | "selfie") {
    if (!token) return null;
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await apiUpload<{ url: string }>("/api/seller/verification/upload", form, token);
    return res.url;
  }

  async function onPickId(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadingId(true);
    setIdPreview(URL.createObjectURL(file));
    try {
      const url = await uploadFile(file, "id");
      setIdUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload ID document");
      setIdPreview(null);
    } finally {
      setUploadingId(false);
    }
  }

  async function onPickSelfie(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadingSelfie(true);
    setSelfiePreview(URL.createObjectURL(file));
    try {
      const url = await uploadFile(file, "selfie");
      setSelfieUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload selfie");
      setSelfiePreview(null);
    } finally {
      setUploadingSelfie(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token || !idUrl || !selfieUrl) {
      setError("Please upload both your ID document and a live selfie.");
      return;
    }

    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: StoredUser }>("/api/seller/verification/submit", {
        method: "POST",
        token,
        body: JSON.stringify({
          idDocumentUrl: idUrl,
          selfieUrl,
          legalName: String(form.get("legalName")),
          idNumber: String(form.get("idNumber")),
          phone: String(form.get("phone")),
          notes: String(form.get("notes") ?? ""),
        }),
      });
      if (res.user) applyProfile(res.user);
      await refreshUser();
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit verification");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProfilePageShell>
      <section className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4">
          Complete Your Seller Profile
        </h1>
        <p className="font-body-lg text-on-surface-variant">
          We verify our sellers to maintain trust and security. Upload your documents and personal details below.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              className="bg-surface-container-lowest p-8 rounded-xl card-shadow border border-outline-variant text-left hover:border-primary transition-all"
              type="button"
              onClick={() => idInputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-full bg-surface-container-low text-primary flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[32px]">badge</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-2">Upload ID Card</h3>
              <p className="font-body-md text-on-surface-variant mb-4">
                Passport, driving license, or national ID.
              </p>
              {idPreview ? (
                <div className="relative h-28 rounded-lg overflow-hidden border border-outline-variant">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="ID preview" className="w-full h-full object-cover" src={idPreview} />
                </div>
              ) : (
                <span className="text-primary font-label-md">{uploadingId ? "Uploading…" : "Browse files"}</span>
              )}
              <input
                ref={idInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                type="file"
                onChange={(e) => void onPickId(e.target.files?.[0])}
              />
            </button>

            <button
              className="bg-surface-container-lowest p-8 rounded-xl card-shadow border border-outline-variant text-left hover:border-primary transition-all"
              type="button"
              onClick={() => selfieInputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-full bg-surface-container-low text-primary flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[32px]">camera_alt</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-2">Take Live Photo</h3>
              <p className="font-body-md text-on-surface-variant mb-4">Selfie for identity confirmation.</p>
              {selfiePreview ? (
                <div className="relative h-28 rounded-lg overflow-hidden border border-outline-variant">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Selfie preview" className="w-full h-full object-cover" src={selfiePreview} />
                </div>
              ) : (
                <span className="text-primary font-label-md">{uploadingSelfie ? "Uploading…" : "Choose photo"}</span>
              )}
              <input
                ref={selfieInputRef}
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                className="hidden"
                type="file"
                onChange={(e) => void onPickSelfie(e.target.files?.[0])}
              />
            </button>
          </div>

          <form
            className="bg-surface-container-lowest p-8 md:p-10 rounded-xl card-shadow border border-outline-variant space-y-6"
            onSubmit={onSubmit}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">security</span>
              <h2 className="font-headline-sm text-headline-sm">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="font-label-md text-on-surface-variant" htmlFor="legalName">
                  Full legal name
                </label>
                <input className={inputClass} defaultValue={user.name} id="legalName" name="legalName" required type="text" />
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-on-surface-variant" htmlFor="idNumber">
                  ID number
                </label>
                <input className={inputClass} id="idNumber" name="idNumber" placeholder="Passport or ID number" required type="text" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-label-md text-on-surface-variant" htmlFor="phone">
                  Phone number
                </label>
                <input className={inputClass} id="phone" name="phone" placeholder="+1 555 000 0000" required type="tel" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-label-md text-on-surface-variant" htmlFor="notes">
                  Notes (optional)
                </label>
                <textarea className={`${inputClass} h-auto py-3`} id="notes" name="notes" rows={3} />
              </div>
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="flex justify-end gap-4 pt-2">
              <Link
                className="px-8 py-3 rounded-lg border border-outline text-on-surface-variant font-label-md hover:bg-surface-container-low transition-all"
                href="/profile"
              >
                Back
              </Link>
              <button
                className="px-10 py-3 rounded-lg bg-primary text-on-primary font-label-md hover:opacity-90 disabled:opacity-60"
                disabled={submitting || uploadingId || uploadingSelfie}
                type="submit"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        </div>

        <aside className="lg:col-span-4">
          <div className="bg-primary text-on-primary p-8 rounded-xl shadow-xl">
            <h3 className="font-headline-sm text-headline-sm mb-6">Why get verified?</h3>
            <ul className="space-y-5 text-sm opacity-90">
              <li className="flex gap-3">
                <span className="material-symbols-outlined">verified</span>
                <span>Display the verified seller badge on your listings.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined">trending_up</span>
                <span>Higher visibility in search results.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined">lock</span>
                <span>Secure identity checks protect buyers and sellers.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </ProfilePageShell>
  );
}
