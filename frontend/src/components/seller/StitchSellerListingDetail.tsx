"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SellerShell } from "@/components/seller/SellerShell";
import {
  nextStatusFromAction,
  STATUS_LABELS,
  STATUS_STYLES,
  statusActionLabel,
} from "@/components/seller/listingStatus";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import type { SellerListing } from "@/lib/types/sellerListing";

export function StitchSellerListingDetail({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (!isSellerAccount(user)) {
      router.replace("/listings");
      return;
    }
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    apiFetch<{ listing: SellerListing }>(`/api/seller/listings/${listingId}`, { token })
      .then((data) => {
        if (cancelled) return;
        setListing(data.listing);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Listing not found");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, listingId, router]);

  async function updateStatus(nextStatus: SellerListing["status"]) {
    if (!token || !listing) return;
    setActionError(null);
    setBusy("status");
    try {
      const data = await apiFetch<{ listing: SellerListing }>(
        `/api/seller/listings/${listing.id}/status`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      setListing(data.listing);
      if (nextStatus === "deleted") {
        router.push("/seller");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(null);
    }
  }

  async function deleteListing() {
    if (!token || !listing) return;
    if (!window.confirm("Delete this listing? It will be hidden from buyers.")) return;
    setActionError(null);
    setBusy("delete");
    try {
      await apiFetch<{ listing: SellerListing }>(`/api/seller/listings/${listing.id}`, {
        method: "DELETE",
        token,
      });
      router.push("/seller");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete listing");
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <SellerShell>
        <div className="py-16 text-center text-on-surface-variant">Loading listing…</div>
      </SellerShell>
    );
  }

  if (error || !listing) {
    return (
      <SellerShell>
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-8 text-center">
          <p className="text-error mb-4">{error ?? "Listing not found"}</p>
          <Link className="text-primary font-label-md hover:underline" href="/seller">
            Back to dashboard
          </Link>
        </div>
      </SellerShell>
    );
  }

  const toggleLabel = statusActionLabel(listing.status, listing.listingType);
  const toggleStatus = nextStatusFromAction(listing.status, listing.listingType);
  const gallery = listing.imageUrls?.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : [];

  return (
    <SellerShell>
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1 font-label-md text-on-surface-variant hover:text-primary transition-colors"
          href="/seller"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-surface-container-high">
            {gallery[0] ? (
              <Image alt="" className="object-cover" fill src={gallery[0]} unoptimized />
            ) : (
              <div className="flex items-center justify-center h-full text-outline">
                <span className="material-symbols-outlined text-6xl">home</span>
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full font-label-md text-[11px] uppercase tracking-wide mb-3 ${STATUS_STYLES[listing.status]}`}
                >
                  {STATUS_LABELS[listing.status]}
                </span>
                <h1 className="font-headline-md text-headline-md text-primary">{listing.title}</h1>
                <p className="font-body-md text-on-surface-variant mt-1">{listing.city}</p>
              </div>
              <p className="font-headline-sm text-headline-sm text-primary">
                {formatPrice(listing.price, listing.currency as CurrencyCode)}
                {listing.listingType === "rent" ? " / mo" : ""}
              </p>
            </div>

            <p className="font-body-md text-on-surface-variant leading-relaxed">
              {listing.description || "No description provided."}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-outline-variant">
              <div>
                <p className="font-label-md text-on-surface-variant text-[11px] uppercase">Type</p>
                <p className="font-body-md capitalize">{listing.listingType}</p>
              </div>
              <div>
                <p className="font-label-md text-on-surface-variant text-[11px] uppercase">Beds</p>
                <p className="font-body-md">{listing.bedrooms}</p>
              </div>
              <div>
                <p className="font-label-md text-on-surface-variant text-[11px] uppercase">Baths</p>
                <p className="font-body-md">{listing.bathrooms}</p>
              </div>
              <div>
                <p className="font-label-md text-on-surface-variant text-[11px] uppercase">Area</p>
                <p className="font-body-md">
                  {listing.areaUnit === "sqm" ? `${listing.area} m²` : `${listing.area.toLocaleString()} sq ft`}
                </p>
              </div>
            </div>

            {listing.address && (
              <p className="font-body-md text-on-surface-variant pt-2">
                <span className="material-symbols-outlined text-sm align-middle mr-1">location_on</span>
                {listing.address}
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4 sticky top-24">
            <h2 className="font-headline-sm text-headline-sm text-primary">Manage listing</h2>

            {actionError && <p className="text-error text-sm">{actionError}</p>}

            {listing.status !== "deleted" && (
              <>
                <Link
                  className="w-full inline-flex items-center justify-center gap-2 border border-primary text-primary px-4 py-3 rounded-lg font-label-md hover:bg-primary-fixed transition-colors"
                  href={`/seller/listings/${listing.id}/edit`}
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                  Edit listing
                </Link>

                {toggleLabel && toggleStatus && (
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-3 rounded-lg font-label-md hover:opacity-90 transition-all disabled:opacity-60"
                    disabled={busy !== null}
                    type="button"
                    onClick={() => updateStatus(toggleStatus)}
                  >
                    {busy === "status" ? "Updating…" : toggleLabel}
                  </button>
                )}

                <Link
                  className="w-full inline-flex items-center justify-center gap-2 border border-outline-variant text-on-surface px-4 py-3 rounded-lg font-label-md hover:border-primary transition-colors"
                  href={`/messages?listing=${listing.id}`}
                >
                  <span className="material-symbols-outlined text-[20px]">forum</span>
                  View inquiries
                </Link>

                <button
                  className="w-full inline-flex items-center justify-center gap-2 border border-error/40 text-error px-4 py-3 rounded-lg font-label-md hover:bg-error-container/20 transition-colors disabled:opacity-60"
                  disabled={busy !== null}
                  type="button"
                  onClick={deleteListing}
                >
                  {busy === "delete" ? "Deleting…" : "Delete listing"}
                </button>
              </>
            )}

            {listing.status === "deleted" && (
              <p className="font-body-md text-on-surface-variant">
                This listing has been deleted and is hidden from buyers.
              </p>
            )}
          </div>
        </aside>
      </div>
    </SellerShell>
  );
}
