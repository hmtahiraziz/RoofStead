"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ListingImageUploader } from "@/components/listings/ListingImageUploader";
import { SellerShell } from "@/components/seller/SellerShell";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { FormattedPriceInput } from "@/components/ui/FormattedPriceInput";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import { AREA_UNITS, DEFAULT_AREA_UNIT } from "@/lib/constants/areas";
import { getCurrencySymbol, type CurrencyCode } from "@/lib/constants/currencies";
import { priceRangeForListingType, validateListingPrice } from "@/lib/listings/filters";

const inputClass =
  "w-full bg-surface border border-outline-variant rounded-lg p-3 focus-ring font-body-md text-on-surface";

export function StitchPostListing() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const [listingType, setListingType] = useState<"sale" | "rent">("rent");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [price, setPrice] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const priceRange = priceRangeForListingType(listingType);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const form = new FormData(e.currentTarget);
    const area = Number(form.get("area"));
    const area_unit = String(form.get("area_unit")) as "sqft" | "sqm";
    const bedrooms = Number(form.get("bedrooms"));
    const bathrooms = Number(form.get("bathrooms"));

    if (price == null || price <= 0) {
      setSubmitError("Enter a valid price.");
      return;
    }
    const priceError = validateListingPrice(price, listingType);
    if (priceError) {
      setSubmitError(priceError);
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      setSubmitError("Enter a valid area.");
      return;
    }
    if (!Number.isFinite(bedrooms) || bedrooms < 0) {
      setSubmitError("Enter a valid number of bedrooms.");
      return;
    }
    if (!Number.isFinite(bathrooms) || bathrooms < 0) {
      setSubmitError("Enter a valid number of bathrooms.");
      return;
    }

    const payload = {
      title: String(form.get("title")),
      description: String(form.get("description") ?? ""),
      listing_type: listingType,
      price,
      currency,
      city: String(form.get("city")),
      address: String(form.get("address") ?? ""),
      area,
      area_unit,
      bedrooms,
      bathrooms,
      ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
    };
    setSubmitting(true);
    try {
      const res = await apiFetch<{ listing: { id: string } }>("/api/listings", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      router.push(`/seller/listings/${res.listing.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not publish listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center px-margin-mobile text-on-surface-variant">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center px-margin-mobile">
        <p className="font-body-lg text-on-surface-variant mb-6">Sign in to list your property.</p>
        <Link
          className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md"
          href="/auth/login?returnTo=%2Fseller%2Fpost"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!isSellerAccount(user)) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center px-margin-mobile">
        <p className="font-body-lg text-on-surface-variant mb-6">Seller accounts can post listings.</p>
        <Link
          className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md"
          href="/listings"
        >
          Browse properties
        </Link>
      </div>
    );
  }

  const verified = user.verification_status === "verified";

  return (
    <SellerShell title="Post Your Listing">
      {!verified && user.verification_status !== "pending" && user.verification_status !== "rejected" && (
      <section className="bg-tertiary-fixed text-on-tertiary-fixed py-3 px-margin-mobile md:px-margin-desktop -mx-margin-mobile md:-mx-margin-desktop mb-8 rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary-container fill-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <p className="font-label-md text-label-md">
              Complete seller verification to publish listings on RoofStead.
            </p>
          </div>
          <Link className="font-label-md text-label-md text-tertiary font-bold underline hover:no-underline transition-all" href="/profile/verification">
            Complete Verification →
          </Link>
        </div>
      </section>
      )}
      {!verified && user.verification_status === "pending" && (
      <section className="bg-secondary-container/40 text-on-secondary-container py-3 px-margin-mobile md:px-margin-desktop -mx-margin-mobile md:-mx-margin-desktop mb-8 rounded-lg border border-secondary-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined">hourglass_top</span>
          <p className="font-label-md text-label-md">
            Your verification is <span className="font-bold">under review</span>. You can prepare listings, but cannot publish until verified.
          </p>
        </div>
      </section>
      )}

      <div className="max-w-4xl mx-auto w-full">
        <p className="text-on-surface-variant text-center mb-12 max-w-xl mx-auto">
          Welcome to RoofStead. Fill in the details below to reach thousands of qualified buyers and renters in
          our curated marketplace.
        </p>

        <div className="flex items-center mb-16 px-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold">
              1
            </div>
            <span className="font-label-md text-label-md text-primary">Details</span>
          </div>
          <div className="stepper-line mx-4" />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-outline-variant text-on-surface-variant flex items-center justify-center font-bold">
              2
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant">Review</span>
          </div>
          <div className="stepper-line mx-4" />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-outline-variant text-on-surface-variant flex items-center justify-center font-bold">
              3
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant">Publish</span>
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="font-headline-sm text-headline-sm text-primary mb-6">What type of listing is this?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(
                [
                  {
                    value: "sale" as const,
                    icon: "sell",
                    title: "For Sale",
                    desc: "Best for homeowners looking to sell their primary residence or investment property permanently.",
                  },
                  {
                    value: "rent" as const,
                    icon: "key",
                    title: "For Rent",
                    desc: "Ideal for landlords looking for long-term tenants or seasonal short-term rentals.",
                  },
                ] as const
              ).map((option) => {
                const selected = listingType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`text-left h-full w-full bg-surface-container-lowest border-2 p-8 rounded-xl ambient-shadow transition-all hover:scale-[1.01] ${
                      selected
                        ? "border-primary-container bg-primary-fixed"
                        : "border-transparent"
                    }`}
                    onClick={() => setListingType(option.value)}
                  >
                    <span
                      className="material-symbols-outlined text-4xl mb-4 text-primary block fill-icon"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {option.icon}
                    </span>
                    <h3 className="font-title-lg text-title-lg mb-2 text-on-surface">{option.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">{option.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <form
            className="space-y-8 bg-surface-container-lowest p-8 md:p-12 rounded-xl ambient-shadow border border-outline-variant"
            onSubmit={onSubmit}
          >
            <input type="hidden" name="listing_type" value={listingType} />

            <div className="grid grid-cols-1 gap-8">
              <h2 className="font-headline-sm text-headline-sm text-primary border-b border-outline-variant pb-4">
                Property Details
              </h2>
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="title">
                  Listing Title
                </label>
                <input
                  className={inputClass}
                  id="title"
                  name="title"
                  placeholder="e.g. Modern Minimalist Loft in Downtown"
                  required
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="description">
                  Description
                </label>
                <textarea
                  className={inputClass}
                  id="description"
                  name="description"
                  placeholder="Describe the atmosphere, unique features, and neighborhood..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="price">
                    {listingType === "rent" ? "Monthly rent" : "Asking price"} ({currency})
                  </label>
                  <FormattedPriceInput
                    className={inputClass}
                    currencySymbol={getCurrencySymbol(currency)}
                    id="price"
                    placeholder={listingType === "rent" ? "2,400" : "500,000"}
                    required
                    value={price}
                    onChange={setPrice}
                  />
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                    Max {listingType === "rent" ? `$${priceRange.max.toLocaleString()}/mo` : `$${priceRange.max.toLocaleString()}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="city">
                    City
                  </label>
                  <input
                    className={inputClass}
                    id="city"
                    name="city"
                    placeholder="Portland, OR"
                    required
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="post-currency">
                    Currency
                  </label>
                  <CurrencySelect
                    id="post-currency"
                    value={currency}
                    onChange={setCurrency}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="area">
                    Area
                  </label>
                  <input
                    className={inputClass}
                    id="area"
                    min={0}
                    name="area"
                    placeholder="120"
                    required
                    type="number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="area_unit">
                    Area unit
                  </label>
                  <select
                    className={inputClass}
                    defaultValue={DEFAULT_AREA_UNIT}
                    id="area_unit"
                    name="area_unit"
                  >
                    {AREA_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="address">
                    Full Address
                  </label>
                  <input
                    className={inputClass}
                    id="address"
                    name="address"
                    placeholder="123 Serenity Way, Portland, OR"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="bedrooms">
                    Bedrooms
                  </label>
                  <input
                    className={inputClass}
                    defaultValue={3}
                    id="bedrooms"
                    min={0}
                    name="bedrooms"
                    required
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="bathrooms">
                    Bathrooms
                  </label>
                  <input
                    className={inputClass}
                    defaultValue={2}
                    id="bathrooms"
                    min={0}
                    name="bathrooms"
                    required
                    step="0.5"
                    type="number"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <span className="font-label-md text-label-md text-on-surface-variant block">Property Imagery</span>
              {token && (
                <ListingImageUploader
                  disabled={submitting}
                  images={imageUrls}
                  token={token}
                  onChange={setImageUrls}
                />
              )}
            </div>

            <div className="pt-12 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-6">
              {submitError && (
                <p className="text-error text-sm w-full md:w-auto">{submitError}</p>
              )}
              <p className="font-body-md text-body-md text-on-surface-variant text-center md:text-left flex-1">
                <span className="material-symbols-outlined text-sm align-middle">info</span> By listing, you agree
                to our <span className="underline">Listing Policy</span>.
              </p>
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  className="flex-1 md:flex-none border border-primary text-primary px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-primary-fixed transition-all"
                  type="button"
                >
                  Save Draft
                </button>
                <button
                  className="flex-1 md:flex-none bg-primary text-on-primary px-10 py-3 rounded-lg font-label-md text-label-md hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "Publishing…" : "Publish listing"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </SellerShell>
  );
}
