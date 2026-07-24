"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SellerShell } from "@/components/seller/SellerShell";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import { AREA_UNITS } from "@/lib/constants/areas";
import type { CurrencyCode } from "@/lib/constants/currencies";
import type { SellerListing } from "@/lib/types/sellerListing";

const inputClass =
  "w-full bg-surface border border-outline-variant rounded-lg p-3 focus-ring font-body-md text-on-surface";

export function StitchEditListing({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [listingType, setListingType] = useState<"sale" | "rent">("rent");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

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
    apiFetch<{ listing: SellerListing }>(`/api/seller/listings/${listingId}`, { token })
      .then((data) => {
        if (cancelled) return;
        setListing(data.listing);
        setListingType(data.listing.listingType);
        setCurrency(data.listing.currency as CurrencyCode);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Listing not found");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, listingId, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !listing || listing.status === "deleted") return;

    const form = new FormData(e.currentTarget);
    const payload = {
      title: String(form.get("title")),
      description: String(form.get("description") ?? ""),
      listing_type: listingType,
      price: Number(form.get("price")),
      currency,
      city: String(form.get("city")),
      address: String(form.get("address") ?? ""),
      area: Number(form.get("area")),
      area_unit: String(form.get("area_unit")) as "sqft" | "sqm",
      bedrooms: Number(form.get("bedrooms")),
      bathrooms: Number(form.get("bathrooms")),
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch<{ listing: SellerListing }>(`/api/seller/listings/${listingId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      router.push(`/seller/listings/${listingId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SellerShell title="Edit listing">
        <div className="py-16 text-center text-on-surface-variant">Loading…</div>
      </SellerShell>
    );
  }

  if (loadError || !listing) {
    return (
      <SellerShell title="Edit listing">
        <div className="rounded-xl border border-error/30 bg-error-container/10 p-8 text-center">
          <p className="text-error mb-4">{loadError ?? "Listing not found"}</p>
          <Link className="text-primary font-label-md hover:underline" href="/seller">
            Back to dashboard
          </Link>
        </div>
      </SellerShell>
    );
  }

  if (listing.status === "deleted") {
    return (
      <SellerShell title="Edit listing">
        <div className="rounded-xl border border-outline-variant p-8 text-center">
          <p className="text-on-surface-variant mb-4">Deleted listings cannot be edited.</p>
          <Link className="text-primary font-label-md hover:underline" href="/seller">
            Back to dashboard
          </Link>
        </div>
      </SellerShell>
    );
  }

  return (
    <SellerShell title="Edit listing">
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1 font-label-md text-on-surface-variant hover:text-primary transition-colors"
          href={`/seller/listings/${listingId}`}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to listing
        </Link>
      </div>

      <form
        className="max-w-3xl space-y-8 bg-surface-container-lowest p-8 md:p-10 rounded-xl ambient-shadow border border-outline-variant"
        onSubmit={onSubmit}
      >
        <section className="space-y-4">
          <h2 className="font-headline-sm text-headline-sm text-primary">Listing type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["sale", "rent"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`p-4 rounded-lg border-2 text-left font-label-md capitalize transition-all ${
                  listingType === value
                    ? "border-primary bg-primary-fixed text-on-surface"
                    : "border-outline-variant text-on-surface-variant"
                }`}
                onClick={() => setListingType(value)}
              >
                For {value}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-2">
          <label className="font-label-md text-on-surface-variant block" htmlFor="title">
            Title
          </label>
          <input className={inputClass} defaultValue={listing.title} id="title" name="title" required type="text" />
        </div>

        <div className="space-y-2">
          <label className="font-label-md text-on-surface-variant block" htmlFor="description">
            Description
          </label>
          <textarea
            className={inputClass}
            defaultValue={listing.description}
            id="description"
            name="description"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="price">
              {listingType === "rent" ? "Monthly rent" : "Asking price"}
            </label>
            <input
              className={inputClass}
              defaultValue={listing.price}
              id="price"
              min={0}
              name="price"
              required
              type="number"
            />
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="edit-currency">
              Currency
            </label>
            <CurrencySelect id="edit-currency" value={currency} onChange={setCurrency} className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="city">
              City
            </label>
            <input className={inputClass} defaultValue={listing.city} id="city" name="city" required type="text" />
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="address">
              Address
            </label>
            <input className={inputClass} defaultValue={listing.address} id="address" name="address" type="text" />
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="area">
              Area
            </label>
            <input className={inputClass} defaultValue={listing.area} id="area" min={0} name="area" required type="number" />
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="area_unit">
              Area unit
            </label>
            <select className={inputClass} defaultValue={listing.areaUnit} id="area_unit" name="area_unit">
              {AREA_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="bedrooms">
              Bedrooms
            </label>
            <input
              className={inputClass}
              defaultValue={listing.bedrooms}
              id="bedrooms"
              min={0}
              name="bedrooms"
              required
              type="number"
            />
          </div>
          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant block" htmlFor="bathrooms">
              Bathrooms
            </label>
            <input
              className={inputClass}
              defaultValue={listing.bathrooms}
              id="bathrooms"
              min={0}
              name="bathrooms"
              required
              step="0.5"
              type="number"
            />
          </div>
        </div>

        {submitError && <p className="text-error text-sm">{submitError}</p>}

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-outline-variant">
          <button
            className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md hover:opacity-90 disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <Link
            className="inline-flex items-center justify-center border border-outline-variant px-8 py-3 rounded-lg font-label-md hover:border-primary transition-colors"
            href={`/seller/listings/${listingId}`}
          >
            Cancel
          </Link>
        </div>
      </form>
    </SellerShell>
  );
}
