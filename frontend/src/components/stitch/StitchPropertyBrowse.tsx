"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { STITCH_BROWSE_LISTINGS, type StitchBrowseListing } from "@/lib/stitch/sample-listings";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { StitchListingCard } from "./StitchListingCard";

type ApiListing = {
  id: string;
  title: string;
  city: string;
  listingType: "rent" | "sale";
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  areaUnit: string;
  imageUrl?: string;
  sellerVerified: boolean;
};

function mapApiToCard(row: ApiListing): StitchBrowseListing {
  return {
    id: row.id,
    title: row.title,
    location: row.city,
    price: formatPrice(row.price, row.currency as CurrencyCode),
    listingType: row.listingType,
    beds: row.bedrooms,
    baths: row.bathrooms,
    sqft: row.areaUnit === "sqm" ? `${row.area} m²` : `${row.area} sq ft`,
    verified: row.sellerVerified,
    imageUrl: row.imageUrl ?? STITCH_BROWSE_LISTINGS[0].imageUrl,
  };
}

export function StitchPropertyBrowse() {
  const [mode, setMode] = useState<"sale" | "rent">("sale");
  const [apiListings, setApiListings] = useState<StitchBrowseListing[] | null>(null);

  useEffect(() => {
    apiFetch<{ listings: ApiListing[] }>(`/api/listings?listing_type=${mode}`)
      .then((data) => setApiListings(data.listings.map(mapApiToCard)))
      .catch(() => setApiListings(null));
  }, [mode]);

  const listings = useMemo(() => {
    const fromApi = apiListings?.filter((l) =>
      mode === "sale" ? l.listingType === "sale" : l.listingType === "rent",
    );
    if (fromApi && fromApi.length > 0) return fromApi;
    return STITCH_BROWSE_LISTINGS.filter((l) =>
      mode === "sale" ? l.listingType === "sale" : l.listingType === "rent",
    );
  }, [apiListings, mode]);

  return (
    <main className="max-w-container-max mx-auto px-margin-desktop py-12">
      <section className="mb-12">
        <div className="bg-surface-container-lowest p-6 rounded-xl card-shadow border border-outline-variant flex flex-wrap lg:flex-nowrap items-center gap-gutter">
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <button
              type="button"
              className={`px-6 py-2 rounded-md text-label-md font-label-md shadow-sm transition-colors ${
                mode === "sale"
                  ? "bg-primary-container text-on-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => setMode("sale")}
            >
              Buy
            </button>
            <button
              type="button"
              className={`px-6 py-2 rounded-md text-label-md font-label-md transition-colors ${
                mode === "rent"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => setMode("rent")}
            >
              Rent
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant hidden lg:block" aria-hidden />
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between mb-2">
              <span className="text-label-md font-label-md text-on-surface-variant">Price Range</span>
              <span className="text-label-md font-label-md text-primary">$400k - $2.5M</span>
            </div>
            <div className="relative w-full h-2 bg-surface-container-high rounded-full">
              <div className="absolute left-1/4 right-1/4 h-full bg-primary-container rounded-full" />
              <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-container rounded-full shadow-md" />
              <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-container rounded-full shadow-md" />
            </div>
          </div>
          <div className="h-8 w-px bg-outline-variant hidden lg:block" aria-hidden />
          <div className="flex items-center gap-3">
            <span className="text-label-md font-label-md text-on-surface-variant mr-1">Beds</span>
            {["1", "2", "3+"].map((bed) => (
              <button
                key={bed}
                type="button"
                className={`w-10 h-10 flex items-center justify-center border rounded-lg text-label-md transition-all ${
                  bed === "3+"
                    ? "bg-primary-container text-on-primary border-primary-container"
                    : "border-outline-variant hover:bg-primary-container hover:text-white hover:border-primary-container"
                }`}
              >
                {bed}
              </button>
            ))}
          </div>
          <div className="h-8 w-px bg-outline-variant hidden lg:block" aria-hidden />
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-3 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-all"
          >
            <span className="material-symbols-outlined text-xl">tune</span>
            All Filters
          </button>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-headline-md text-headline-md text-primary mb-2">
              Properties in Palo Alto
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Showing 2,450 curated residential listings
            </p>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="text-label-md font-label-md">Sort by:</span>
            <button
              type="button"
              className="flex items-center gap-1 font-label-md text-label-md text-primary"
            >
              Newest{" "}
              <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {listings.map((listing) => (
            <StitchListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className="flex justify-center items-center gap-2 mt-16">
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container-low transition-all"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-container text-on-primary"
          >
            1
          </button>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low"
          >
            2
          </button>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low"
          >
            3
          </button>
          <span className="px-2">...</span>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low"
          >
            12
          </button>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container-low transition-all"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </section>
    </main>
  );
}
