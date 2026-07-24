"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/components/auth/AdminProvider";
import { apiFetch } from "@/lib/api/client";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

type DetailResponse = {
  listing: {
    id: string;
    title: string;
    description: string;
    city: string;
    address: string;
    listingType: string;
    price: number;
    currency: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    areaUnit: string;
    imageUrls: string[];
    imageUrl?: string;
    sellerId: string;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    verificationStatus?: string;
    role?: string;
  } | null;
};

const LISTING_PLACEHOLDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAWGVRWPTmP406LprVAQpFfAPTBz2YXexOSGrwjZoO-Z1iSrjkaPioEeC4EWWhMthKWCWL-Lo-nr-AQRTQj_3vAuNScH9n_7DFUpro0WDJHbYPgv1j8wAbpa_QrJOHZsCBnWQKVb67Pn7dgD6PRRpU0huTva2daMUbblCQj5ItlksLXQf0BLoIlwU2KhTvGz5U4cDTQ4aZMJCF0pyKQ04M6kX6IPobpMCEVV5wkIVrfWMxf4yus2GY0NkyCTE-d4stPbzFYBwjnYpm0";

export function StitchAdminListingDetail({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { token, loading: authLoading } = useAdminAuth();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<DetailResponse>(`/api/admin/listings/${listingId}`, { token });
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load listing");
    } finally {
      setLoading(false);
    }
  }, [token, listingId]);

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
        Loading property…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center">
          <p className="mb-4 text-error">{error}</p>
          <Link className="font-label-md text-primary hover:underline" href="/admin?section=listings">
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { listing, seller } = data;
  const images = listing.imageUrls.length ? listing.imageUrls : [listing.imageUrl ?? LISTING_PLACEHOLDER];
  const hero = images[galleryIndex] ?? LISTING_PLACEHOLDER;
  const sellerAvatar = userAvatarSrc(seller?.avatarUrl, "small");

  return (
    <AdminShell
      section="listings"
      onSectionChange={(s) => {
        router.push(s === "dashboard" ? "/admin" : `/admin?section=${s}`);
      }}
    >
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
          href="/admin?section=listings"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to listings
        </Link>
      </div>

      <AdminPageHeader
        description="Full property details for this listing."
        title={listing.title}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest card-shadow">
            <div className="relative aspect-[16/10] bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={hero} />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-outline-variant p-4">
                {images.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === galleryIndex ? "border-primary" : "border-transparent"
                    }`}
                    type="button"
                    onClick={() => setGalleryIndex(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="" className="h-full w-full object-cover" src={url} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:p-8 card-shadow">
            <h2 className="mb-4 font-title-lg text-title-lg text-primary">Description</h2>
            <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface">
              {listing.description || "No description provided."}
            </p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
            <p className="font-display-lg text-display-lg text-primary">
              {formatPrice(listing.price, listing.currency as CurrencyCode)}
            </p>
            <p className="mt-1 font-label-md text-label-md capitalize text-on-surface-variant">
              For {listing.listingType}
            </p>

            <dl className="mt-6 space-y-4 font-body-md text-body-md">
              <div>
                <dt className="text-on-surface-variant">Location</dt>
                <dd className="mt-0.5">{listing.city}</dd>
                {listing.address && <dd className="text-on-surface-variant">{listing.address}</dd>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-on-surface-variant">Bedrooms</dt>
                  <dd className="mt-0.5">{listing.bedrooms}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Bathrooms</dt>
                  <dd className="mt-0.5">{listing.bathrooms}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Area</dt>
                  <dd className="mt-0.5">
                    {listing.area.toLocaleString()} {listing.areaUnit}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Listing ID</dt>
                  <dd className="mt-0.5 font-mono text-sm">#{listing.id.slice(-8)}</dd>
                </div>
              </div>
            </dl>
          </section>

          {seller && (
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
              <h2 className="mb-4 font-title-lg text-title-lg text-primary">Seller</h2>
              <div className="flex items-center gap-4">
                <Image
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                  height={48}
                  src={sellerAvatar}
                  unoptimized
                  width={48}
                />
                <div>
                  <Link
                    className="font-title-lg text-[15px] hover:text-primary"
                    href={`/admin/users/${seller.id}`}
                  >
                    {seller.name}
                  </Link>
                  <p className="text-sm text-on-surface-variant">{seller.email}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Role</dt>
                  <dd className="capitalize">{seller.role ?? "seller"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Verification</dt>
                  <dd className="capitalize">{seller.verificationStatus ?? "unverified"}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
