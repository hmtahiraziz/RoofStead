"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import { AREA_UNITS, DEFAULT_AREA_UNIT } from "@/lib/constants/areas";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

const inputClass =
  "w-full bg-surface border border-outline-variant rounded-lg p-3 focus-ring font-body-md text-on-surface";

export function StitchPostListing() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const [listingType, setListingType] = useState<"sale" | "rent">("rent");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const form = new FormData(e.currentTarget);
    const price = Number(form.get("price"));
    const area = Number(form.get("area"));
    const area_unit = String(form.get("area_unit")) as "sqft" | "sqm";
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
      bedrooms: 3,
      bathrooms: 2,
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

  if (!authLoading && user && !isSellerAccount(user)) {
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

  if (!authLoading && !user) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center px-margin-mobile">
        <p className="font-body-lg text-on-surface-variant mb-6">Sign in to list your property.</p>
        <Link
          className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md"
          href="/auth/login"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const verified = user?.verification_status === "verified";

  return (
    <div className="bg-background text-on-surface font-body-lg min-h-screen flex flex-col">
      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <nav className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Image alt="RoofStead Logo" className="h-10 w-auto" height={40} src={STITCH_LOGO_SRC} width={120} />
            </Link>
            <div className="hidden md:flex gap-6">
              <Link
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                href="/listings"
              >
                Properties
              </Link>
              <span className="font-label-md text-label-md text-on-surface-variant">Market Trends</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Guides</span>
              <span className="font-label-md text-label-md text-on-surface-variant">About</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-label-md text-label-md text-primary font-bold border-b-2 border-primary pb-1">
              List Property
            </span>
            <Link
              className="font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low px-4 py-2 rounded-lg transition-all"
              href="/auth/login"
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      {!verified && user?.verification_status !== "pending" && user?.verification_status !== "rejected" && (
      <section className="bg-tertiary-fixed text-on-tertiary-fixed py-3 px-margin-desktop">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
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
      {!verified && user?.verification_status === "pending" && (
      <section className="bg-secondary-container/40 text-on-secondary-container py-3 px-margin-desktop border-b border-secondary-container">
        <div className="max-w-container-max mx-auto flex items-center gap-2">
          <span className="material-symbols-outlined">hourglass_top</span>
          <p className="font-label-md text-label-md">
            Your verification is <span className="font-bold">under review</span>. You can prepare listings, but cannot publish until verified.
          </p>
        </div>
      </section>
      )}

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="text-center mb-12">
          <h1 className="font-display-lg text-display-lg text-primary mb-4">Post Your Listing</h1>
          <p className="text-on-surface-variant max-w-xl mx-auto">
            Welcome to RoofStead. Fill in the details below to reach thousands of qualified buyers and renters in
            our curated marketplace.
          </p>
        </div>

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
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input
                      className={`${inputClass} pl-8`}
                      id="price"
                      min={0}
                      name="price"
                      placeholder={listingType === "rent" ? "2,400" : "500,000"}
                      required
                      type="number"
                    />
                  </div>
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
              </div>
            </div>

            <div className="space-y-4">
              <span className="font-label-md text-label-md text-on-surface-variant block">Amenities &amp; Features</span>
              <div className="flex flex-wrap gap-2">
                {["3 Bedrooms", "2 Bathrooms", "Pool", "Solar Ready"].map((chip) => (
                  <span
                    key={chip}
                    className="bg-surface-container-high px-4 py-2 rounded-full font-body-md text-body-md flex items-center gap-2 text-on-surface"
                  >
                    {chip}
                    <button className="text-on-surface-variant hover:text-error" type="button" aria-label={`Remove ${chip}`}>
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                ))}
                <button
                  className="border border-dashed border-outline text-primary px-4 py-2 rounded-full font-body-md text-body-md hover:bg-primary-fixed-dim transition-colors"
                  type="button"
                >
                  + Add More
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <span className="font-label-md text-label-md text-on-surface-variant block">Property Imagery</span>
              <div className="border-2 border-dashed border-outline-variant rounded-xl p-12 text-center bg-surface hover:bg-surface-container-low transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                  </div>
                  <div>
                    <p className="font-title-lg text-title-lg text-primary">Drag and drop images here</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Support for JPG, PNG and HEIC. High resolution 4K photos recommended.
                    </p>
                  </div>
                  <button
                    className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md text-label-md hover:opacity-90 transition-all"
                    type="button"
                  >
                    Select Files
                  </button>
                </div>
              </div>
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
      </main>

      <footer className="bg-surface-container border-t border-outline-variant mt-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop py-12 max-w-container-max mx-auto">
          <div className="md:col-span-1">
            <h4 className="font-headline-sm text-headline-sm font-bold text-primary mb-4">RoofStead</h4>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Elevating the residential experience through transparency and design.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Marketplace</h5>
            <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary underline decoration-2 underline-offset-4 transition-all" href="/listings">
              Browse Homes
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Resources</h5>
            <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary underline decoration-2 underline-offset-4 transition-all" href="/seller/post">
              Seller Resources
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Legal</h5>
            <span className="font-body-md text-body-md text-on-surface-variant">Privacy Policy</span>
          </div>
        </div>
        <div className="px-margin-desktop py-6 border-t border-outline-variant/30 text-center">
          <p className="font-label-md text-label-md text-on-surface-variant">
            © 2024 RoofStead Real Estate. All rights reserved. Licensed Brokerage.
          </p>
        </div>
      </footer>
    </div>
  );
}
