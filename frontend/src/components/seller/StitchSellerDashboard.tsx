"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SellerShell } from "@/components/seller/SellerShell";
import { STATUS_LABELS, STATUS_STYLES } from "@/components/seller/listingStatus";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import type { SellerListing } from "@/lib/types/sellerListing";

export function StitchSellerDashboard() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    apiFetch<{ listings: SellerListing[] }>("/api/seller/listings", { token })
      .then((data) => {
        if (cancelled) return;
        setListings(data.listings);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load listings");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, router]);

  const activeCount = listings.filter((l) => l.status === "active").length;

  return (
    <SellerShell title="Seller dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="font-body-md text-on-surface-variant">
            Manage your properties, update status, and respond to inquiries.
          </p>
          {!loading && (
            <p className="font-label-md text-label-md text-on-surface-variant mt-2">
              {activeCount} active · {listings.length} total
            </p>
          )}
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md hover:opacity-90 transition-all"
          href="/seller/post"
        >
          <span className="material-symbols-outlined text-[20px]">add_home</span>
          Post new listing
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-error/30 bg-error-container/10 px-4 py-3 text-error text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant">Loading your listings…</div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-4 block">home_work</span>
          <h2 className="font-headline-sm text-headline-sm text-primary mb-2">No listings yet</h2>
          <p className="font-body-md text-on-surface-variant mb-6 max-w-md mx-auto">
            Create your first property listing to start reaching buyers and renters on RoofStead.
          </p>
          <Link
            className="inline-flex bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md"
            href="/seller/post"
          >
            Post your first listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              className="group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden ambient-shadow hover:border-primary-container transition-all"
              href={`/seller/listings/${listing.id}`}
            >
              <div className="relative aspect-[4/3] bg-surface-container-high">
                {listing.imageUrl ? (
                  <Image
                    alt=""
                    className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                    fill
                    src={listing.imageUrl}
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-outline">
                    <span className="material-symbols-outlined text-5xl">home</span>
                  </div>
                )}
                <span
                  className={`absolute top-3 left-3 px-3 py-1 rounded-full font-label-md text-[11px] uppercase tracking-wide ${STATUS_STYLES[listing.status]}`}
                >
                  {STATUS_LABELS[listing.status]}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="font-title-lg text-title-lg text-on-surface line-clamp-1">{listing.title}</h3>
                <p className="font-body-md text-on-surface-variant">{listing.city}</p>
                <p className="font-headline-sm text-headline-sm text-primary">
                  {formatPrice(listing.price, listing.currency as CurrencyCode)}
                  {listing.listingType === "rent" ? " / mo" : ""}
                </p>
                <p className="font-body-md text-on-surface-variant text-sm">
                  {listing.bedrooms} bed · {listing.bathrooms} bath ·{" "}
                  {listing.areaUnit === "sqm" ? `${listing.area} m²` : `${listing.area.toLocaleString()} sq ft`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SellerShell>
  );
}
