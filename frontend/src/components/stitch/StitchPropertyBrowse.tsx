"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import {
  buildListingsApiQuery,
  DEFAULT_BROWSE_FILTERS,
  filterSampleListings,
  filtersFromSearchParams,
  filtersToSearchParams,
  formatPriceRangeLabel,
  hasRestrictiveFilters,
  RENT_PRICE_RANGE,
  SALE_PRICE_RANGE,
  sortListingsClient,
  type BrowseFilters,
  type ListingSort,
  type PropertyTypeFilter,
} from "@/lib/listings/filters";
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
  propertyType?: string;
  imageUrl?: string;
  sellerVerified: boolean;
};

function mapApiToCard(row: ApiListing): StitchBrowseListing {
  return {
    id: row.id,
    title: row.title,
    location: row.city,
    price: formatPrice(row.price, row.currency as CurrencyCode),
    numericPrice: row.price,
    listingType: row.listingType,
    propertyType: row.propertyType ?? "House",
    beds: row.bedrooms,
    baths: row.bathrooms,
    sqft: row.areaUnit === "sqm" ? `${row.area} m²` : `${row.area.toLocaleString()} sq ft`,
    numericArea: row.area,
    verified: row.sellerVerified,
    imageUrl: row.imageUrl ?? STITCH_BROWSE_LISTINGS[0].imageUrl,
  };
}

const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const PROPERTY_TYPES: { value: PropertyTypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "house", label: "House" },
  { value: "mansion", label: "Mansion" },
  { value: "villa", label: "Villa" },
];

function filtersEqual(a: BrowseFilters, b: BrowseFilters): boolean {
  return (
    a.mode === b.mode &&
    a.q === b.q &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.beds === b.beds &&
    a.baths === b.baths &&
    a.propertyType === b.propertyType &&
    a.minArea === b.minArea &&
    a.maxArea === b.maxArea &&
    a.sort === b.sort
  );
}

export function StitchPropertyBrowse() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const draftPriceRange = appliedFilters.mode === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;

  const [draftFilters, setDraftFilters] = useState<BrowseFilters>(appliedFilters);
  const [apiListings, setApiListings] = useState<StitchBrowseListing[] | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const hasPendingChanges = !filtersEqual(draftFilters, appliedFilters);
  const priceRange =
    draftFilters.mode === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  const applyFilters = useCallback(
    (next: BrowseFilters) => {
      const params = filtersToSearchParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const patchDraft = useCallback((patch: Partial<BrowseFilters>) => {
    setDraftFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.mode && patch.mode !== prev.mode) {
        const range = patch.mode === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;
        next.minPrice = range.min;
        next.maxPrice = range.max;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiLoaded(false);
    const query = buildListingsApiQuery(appliedFilters);
    apiFetch<{ listings: ApiListing[] }>(`/api/listings?${query}`)
      .then((data) => {
        if (cancelled) return;
        setApiListings(data.listings.map(mapApiToCard));
      })
      .catch(() => {
        if (cancelled) return;
        setApiListings(null);
      })
      .finally(() => {
        if (cancelled) return;
        setApiLoaded(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  const sampleListings = useMemo(
    () =>
      filterSampleListings(
        STITCH_BROWSE_LISTINGS.filter((l) =>
          appliedFilters.mode === "sale" ? l.listingType === "sale" : l.listingType === "rent",
        ),
        appliedFilters,
      ),
    [appliedFilters],
  );

  const liveMatches = useMemo(
    () => filterSampleListings(apiListings ?? [], appliedFilters),
    [apiListings, appliedFilters],
  );

  const listings = useMemo(() => {
    if (!apiLoaded) return [];

    if (liveMatches.length > 0) {
      return sortListingsClient(liveMatches, appliedFilters.sort);
    }

    if (sampleListings.length > 0) {
      return sortListingsClient(sampleListings, appliedFilters.sort);
    }

    return [];
  }, [apiLoaded, liveMatches, sampleListings, appliedFilters]);

  const usingSampleFallback =
    apiLoaded && liveMatches.length === 0 && sampleListings.length > 0 && listings.length > 0;

  const draftPriceLabel = formatPriceRangeLabel(
    draftFilters.minPrice,
    draftFilters.maxPrice,
    draftFilters.mode,
  );
  const headingLocation = appliedFilters.q.trim() || "Palo Alto";

  function handleApply() {
    applyFilters(draftFilters);
    setShowAllFilters(false);
  }

  function handleClearDraft() {
    setDraftFilters({
      ...DEFAULT_BROWSE_FILTERS,
      mode: draftFilters.mode,
      q: appliedFilters.q,
      sort: appliedFilters.sort,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
    });
  }

  function handleResetAll() {
    const reset: BrowseFilters = {
      ...DEFAULT_BROWSE_FILTERS,
      mode: appliedFilters.mode,
      minPrice: draftPriceRange.min,
      maxPrice: draftPriceRange.max,
    };
    setDraftFilters(reset);
    applyFilters(reset);
  }

  return (
    <main className="max-w-container-max mx-auto px-margin-desktop py-12">
      <section className="mb-12">
        <div className="bg-surface-container-lowest p-6 rounded-xl card-shadow border border-outline-variant flex flex-wrap lg:flex-nowrap items-center gap-gutter">
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <button
              type="button"
              className={`px-6 py-2 rounded-md text-label-md font-label-md shadow-sm transition-colors ${
                draftFilters.mode === "sale"
                  ? "bg-primary-container text-on-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => patchDraft({ mode: "sale" })}
            >
              Buy
            </button>
            <button
              type="button"
              className={`px-6 py-2 rounded-md text-label-md font-label-md transition-colors ${
                draftFilters.mode === "rent"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => patchDraft({ mode: "rent" })}
            >
              Rent
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant hidden lg:block" aria-hidden />
          <div className="flex-1 min-w-[220px]">
            <div className="flex justify-between mb-2">
              <span className="text-label-md font-label-md text-on-surface-variant">Price Range</span>
              <span className="text-label-md font-label-md text-primary">{draftPriceLabel}</span>
            </div>
            <div className="space-y-2">
              <input
                aria-label="Minimum price"
                className="w-full accent-primary-container"
                max={draftFilters.maxPrice - priceRange.step}
                min={priceRange.min}
                step={priceRange.step}
                type="range"
                value={draftFilters.minPrice}
                onChange={(e) =>
                  patchDraft({
                    minPrice: Math.min(Number(e.target.value), draftFilters.maxPrice - priceRange.step),
                  })
                }
              />
              <input
                aria-label="Maximum price"
                className="w-full accent-primary-container"
                max={priceRange.max}
                min={draftFilters.minPrice + priceRange.step}
                step={priceRange.step}
                type="range"
                value={draftFilters.maxPrice}
                onChange={(e) =>
                  patchDraft({
                    maxPrice: Math.max(Number(e.target.value), draftFilters.minPrice + priceRange.step),
                  })
                }
              />
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
                  draftFilters.beds === bed
                    ? "bg-primary-container text-on-primary border-primary-container"
                    : "border-outline-variant hover:bg-primary-container hover:text-white hover:border-primary-container"
                }`}
                onClick={() => patchDraft({ beds: draftFilters.beds === bed ? null : bed })}
              >
                {bed}
              </button>
            ))}
          </div>
          <div className="h-8 w-px bg-outline-variant hidden lg:block" aria-hidden />
          <button
            type="button"
            className={`flex items-center gap-2 px-6 py-3 border rounded-lg text-label-md font-label-md transition-all ${
              showAllFilters
                ? "border-primary-container bg-primary-container/10 text-primary"
                : "border-outline-variant hover:bg-surface-container-low"
            }`}
            onClick={() => setShowAllFilters((v) => !v)}
          >
            <span className="material-symbols-outlined text-xl">tune</span>
            All Filters
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-label-md font-label-md transition-all active:scale-95 ${
              hasPendingChanges
                ? "bg-primary text-on-primary shadow-md hover:opacity-95"
                : "bg-surface-container-high text-on-surface-variant cursor-default"
            }`}
            disabled={!hasPendingChanges}
            onClick={handleApply}
          >
            <span className="material-symbols-outlined text-xl">check</span>
            Apply
          </button>
        </div>

        {showAllFilters && (
          <div className="mt-4 bg-surface-container-lowest p-6 rounded-xl card-shadow border border-outline-variant grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant mb-3">Property type</p>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg text-label-md border transition-all ${
                      draftFilters.propertyType === opt.value
                        ? "bg-primary-container text-on-primary border-primary-container"
                        : "border-outline-variant hover:border-primary-container"
                    }`}
                    onClick={() => patchDraft({ propertyType: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant mb-3">Bathrooms</p>
              <div className="flex gap-2">
                {["1", "2", "3+"].map((bath) => (
                  <button
                    key={bath}
                    type="button"
                    className={`w-10 h-10 flex items-center justify-center border rounded-lg text-label-md transition-all ${
                      draftFilters.baths === bath
                        ? "bg-primary-container text-on-primary border-primary-container"
                        : "border-outline-variant hover:bg-primary-container hover:text-white hover:border-primary-container"
                    }`}
                    onClick={() => patchDraft({ baths: draftFilters.baths === bath ? null : bath })}
                  >
                    {bath}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant mb-3">Min sq ft</p>
              <input
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary-container"
                min={0}
                placeholder="e.g. 1500"
                type="number"
                value={draftFilters.minArea ?? ""}
                onChange={(e) =>
                  patchDraft({
                    minArea: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <p className="text-label-md font-label-md text-on-surface-variant mb-3">Max sq ft</p>
              <input
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low outline-none focus:border-primary-container"
                min={0}
                placeholder="e.g. 5000"
                type="number"
                value={draftFilters.maxArea ?? ""}
                onChange={(e) =>
                  patchDraft({
                    maxArea: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-label-md text-on-surface-variant hover:text-primary"
                onClick={handleClearDraft}
              >
                Clear
              </button>
              <button
                type="button"
                className={`px-6 py-2 rounded-lg text-label-md font-label-md transition-all ${
                  hasPendingChanges
                    ? "bg-primary text-on-primary hover:opacity-95"
                    : "bg-surface-container-high text-on-surface-variant cursor-default"
                }`}
                disabled={!hasPendingChanges}
                onClick={handleApply}
              >
                Apply filters
              </button>
            </div>
          </div>
        )}

        {hasPendingChanges && (
          <p className="mt-3 text-body-md text-on-surface-variant">
            You have unsaved filter changes. Click <span className="text-primary font-medium">Apply</span> to
            update results.
          </p>
        )}
      </section>

      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-headline-md text-headline-md text-primary mb-2">
              Properties in {headingLocation}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {loading
                ? "Searching…"
                : `Showing ${listings.length} curated residential listings${usingSampleFallback ? " (preview)" : ""}`}
            </p>
          </div>
          <div className="relative flex items-center gap-2 text-on-surface-variant">
            <span className="text-label-md font-label-md">Sort by:</span>
            <button
              type="button"
              className="flex items-center gap-1 font-label-md text-label-md text-primary"
              onClick={() => setSortOpen((v) => !v)}
            >
              {SORT_OPTIONS.find((o) => o.value === appliedFilters.sort)?.label ?? "Newest"}{" "}
              <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-20 min-w-[180px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`block w-full text-left px-4 py-2 text-body-md hover:bg-surface-container-low ${
                      appliedFilters.sort === opt.value ? "text-primary font-medium" : "text-on-surface"
                    }`}
                    onClick={() => {
                      const next = { ...appliedFilters, sort: opt.value };
                      setDraftFilters((prev) => ({ ...prev, sort: opt.value }));
                      applyFilters(next);
                      setSortOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-high rounded-2xl aspect-[4/5] animate-pulse"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <p className="font-body-lg mb-2">No properties match your filters.</p>
            <button
              type="button"
              className="text-primary font-label-md hover:underline"
              onClick={handleResetAll}
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {listings.map((listing) => (
              <StitchListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
