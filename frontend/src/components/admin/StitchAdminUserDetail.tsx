"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/components/auth/AdminProvider";
import { apiFetch } from "@/lib/api/client";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

type UserDetailResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
    profile_picture_url?: string;
    email_verified?: boolean;
    verification_status?: string;
    intends_seller?: boolean;
    is_active?: boolean;
    is_deleted?: boolean;
    seller_phone?: string;
    seller_id_number?: string;
    seller_legal_name?: string;
  };
  listings: {
    id: string;
    title: string;
    city: string;
    address?: string;
    listingType: string;
    price: number;
    currency: string;
    status: string;
    bedrooms?: number;
    bathrooms?: number;
    imageUrl?: string;
  }[];
  verificationHistory: {
    id: string;
    status: string;
    selfieUrl?: string;
    idDocumentUrl?: string;
    notes?: string;
    rejectionReason?: string;
    submittedAt?: string;
    reviewedAt?: string;
  }[];
};

type Tab = "listings" | "verification";

const LISTING_PLACEHOLDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAWGVRWPTmP406LprVAQpFfAPTBz2YXexOSGrwjZoO-Z1iSrjkaPioEeC4EWWhMthKWCWL-Lo-nr-AQRTQj_3vAuNScH9n_7DFUpro0WDJHbYPgv1j8wAbpa_QrJOHZsCBnWQKVb67Pn7dgD6PRRpU0huTva2daMUbblCQj5ItlksLXQf0BLoIlwU2KhTvGz5U4cDTQ4aZMJCF0pyKQ04M6kX6IPobpMCEVV5wkIVrfWMxf4yus2GY0NkyCTE-d4stPbzFYBwjnYpm0";

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function verificationStatusBadge(status?: string) {
  const value = status ?? "unverified";
  if (value === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-fixed px-2.5 py-1 font-label-md text-label-md text-on-primary-fixed">
        <span className="material-symbols-outlined text-[14px]">verified</span>
        Verified
      </span>
    );
  }
  if (value === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary-container px-2.5 py-1 font-label-md text-label-md text-on-secondary-container">
        <span className="material-symbols-outlined text-[14px]">pending</span>
        Pending
      </span>
    );
  }
  if (value === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-error-container px-2.5 py-1 font-label-md text-label-md text-on-error-container">
        <span className="material-symbols-outlined text-[14px]">cancel</span>
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container-high px-2.5 py-1 font-label-md text-label-md text-on-surface-variant">
      Unverified
    </span>
  );
}

function historyStatusBadge(status: string) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 font-label-md text-label-md text-on-primary-fixed">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-0.5 font-label-md text-label-md text-on-error-container">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-0.5 font-label-md text-label-md text-on-secondary-container">
      Pending
    </span>
  );
}

export function StitchAdminUserDetail({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, loading: authLoading } = useAdminAuth();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialTab = searchParams.get("tab") === "verification" ? "verification" : "listings";
  const [tab, setTab] = useState<Tab>(initialTab);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<UserDetailResponse>(`/api/admin/users/${userId}`, { token });
      setData(res);
      setError(null);
      if (searchParams.get("tab") === "verification") {
        setTab("verification");
      } else if (res.verificationHistory.length > 0 && res.listings.length === 0) {
        setTab("verification");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load user");
    } finally {
      setLoading(false);
    }
  }, [token, userId, searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    void load();
  }, [authLoading, token, router, load]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        Loading user…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center">
          <p className="mb-4 text-error">{error}</p>
          <Link className="font-label-md text-primary hover:underline" href="/admin?section=users">
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, listings, verificationHistory } = data;
  const avatar = userAvatarSrc(user.profile_picture_url, "small");
  const priorRejections = verificationHistory.filter((v) => v.status === "rejected");
  const pendingSubmission = verificationHistory.find((v) => v.status === "pending");

  return (
    <AdminShell
      section="users"
      onSectionChange={(s) => {
        router.push(s === "dashboard" ? "/admin" : `/admin?section=${s}`);
      }}
    >
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
          href="/admin?section=users"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to users
        </Link>
      </div>

      <AdminPageHeader description="View account details, listings, and verification history." title={user.name} />

      <section className="mb-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:p-8 card-shadow">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            {user.profile_picture_url ? (
              <Image
                alt=""
                className="h-16 w-16 rounded-full object-cover"
                height={64}
                src={avatar}
                unoptimized
                width={64}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest font-title-lg text-[20px] text-on-surface-variant">
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-title-lg text-title-lg">{user.name}</h2>
              <p className="text-on-surface-variant">{user.email}</p>
              <p className="mt-1 font-label-md text-label-md text-on-surface-variant">
                {user.role === "seller" || user.intends_seller ? "Seller" : "Buyer"}
                {user.is_active === false && " · Suspended"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {verificationStatusBadge(user.verification_status)}
            {pendingSubmission && (
              <Link
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 font-label-md text-on-primary transition-colors hover:bg-primary/90"
                href={`/admin/verifications/${pendingSubmission.id}`}
              >
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
                Review pending
              </Link>
            )}
          </div>
        </div>

        {(user.seller_legal_name || user.seller_id_number || user.seller_phone) && (
          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-outline-variant pt-6 text-sm md:grid-cols-3">
            <div>
              <dt className="text-on-surface-variant">Legal name</dt>
              <dd className="mt-0.5">{user.seller_legal_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">ID number</dt>
              <dd className="mt-0.5">{user.seller_id_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Phone</dt>
              <dd className="mt-0.5">{user.seller_phone || "—"}</dd>
            </div>
          </dl>
        )}

        {priorRejections.length > 0 && (
          <div className="mt-6 rounded-lg border border-error-container bg-error-container/10 p-4">
            <p className="flex items-center gap-2 font-label-md text-on-error-container">
              <span className="material-symbols-outlined text-[18px]">history</span>
              Previously rejected {priorRejections.length} time{priorRejections.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              See the Verification History tab for full details on past submissions.
            </p>
          </div>
        )}
      </section>

      <div className="mb-6 flex gap-1 border-b border-outline-variant">
        <button
          className={`px-4 py-3 font-label-md transition-colors ${
            tab === "listings"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
          type="button"
          onClick={() => setTab("listings")}
        >
          Listings
          {listings.length > 0 && (
            <span className="ml-2 rounded-full bg-surface-container-high px-2 py-0.5 text-xs">
              {listings.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-3 font-label-md transition-colors ${
            tab === "verification"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
          type="button"
          onClick={() => setTab("verification")}
        >
          Verification History
          {verificationHistory.length > 0 && (
            <span className="ml-2 rounded-full bg-surface-container-high px-2 py-0.5 text-xs">
              {verificationHistory.length}
            </span>
          )}
        </button>
      </div>

      {tab === "listings" && (
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest card-shadow">
          {listings.length === 0 ? (
            <p className="p-8 text-on-surface-variant">This user has no listings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    <th className="p-4 font-medium">Property</th>
                    <th className="p-4 font-medium">Price</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface">
                  {listings.map((listing) => (
                    <tr
                      key={listing.id}
                      className="group cursor-pointer transition-colors hover:bg-surface-container-lowest"
                      onClick={() => router.push(`/admin/listings/${listing.id}`)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-variant">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt=""
                              className="h-full w-full object-cover"
                              src={listing.imageUrl || LISTING_PLACEHOLDER}
                            />
                          </div>
                          <div>
                            <p className="font-title-lg text-[15px] group-hover:text-primary">{listing.title}</p>
                            <p className="text-sm text-on-surface-variant">{listing.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-title-lg text-primary">
                        {formatPrice(listing.price, listing.currency as CurrencyCode)}
                      </td>
                      <td className="p-4 capitalize text-on-surface-variant">{listing.listingType}</td>
                      <td className="p-4 capitalize text-on-surface-variant">{listing.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "verification" && (
        <section className="space-y-4">
          {verificationHistory.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-on-surface-variant card-shadow">
              No verification submissions yet.
            </div>
          ) : (
            verificationHistory.map((entry, index) => (
              <article
                key={entry.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-label-md text-on-surface-variant">
                      Submission #{verificationHistory.length - index}
                    </p>
                    <p className="mt-1 font-title-lg text-[15px]">
                      Submitted {formatDateTime(entry.submittedAt)}
                    </p>
                    {entry.reviewedAt && (
                      <p className="mt-0.5 text-sm text-on-surface-variant">
                        Reviewed {formatDateTime(entry.reviewedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {historyStatusBadge(entry.status)}
                    {entry.status === "pending" && (
                      <Link
                        className="rounded-lg border border-outline-variant px-3 py-1.5 font-label-md text-primary hover:bg-surface-container"
                        href={`/admin/verifications/${entry.id}`}
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </div>

                {entry.rejectionReason && (
                  <div className="mt-4 rounded-lg border border-error-container/30 bg-error-container/10 p-4">
                    <p className="font-label-md text-on-error-container">Rejection reason</p>
                    <p className="mt-1 text-sm text-on-surface">{entry.rejectionReason}</p>
                  </div>
                )}

                {entry.notes && (
                  <p className="mt-4 text-sm">
                    <span className="text-on-surface-variant">Seller notes:</span> {entry.notes}
                  </p>
                )}

                {(entry.idDocumentUrl || entry.selfieUrl) && (
                  <div className="mt-4 flex flex-wrap gap-4">
                    {entry.idDocumentUrl && (
                      <a
                        className="block overflow-hidden rounded-lg border border-outline-variant"
                        href={entry.idDocumentUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="ID document" className="h-24 w-36 object-cover" src={entry.idDocumentUrl} />
                      </a>
                    )}
                    {entry.selfieUrl && (
                      <a
                        className="block overflow-hidden rounded-lg border border-outline-variant"
                        href={entry.selfieUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="Selfie" className="h-24 w-24 object-cover" src={entry.selfieUrl} />
                      </a>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}
    </AdminShell>
  );
}
