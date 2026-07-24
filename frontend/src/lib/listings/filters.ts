export type ListingMode = "sale" | "rent";
export type ListingSort = "newest" | "price_asc" | "price_desc";
export type PropertyTypeFilter = "all" | "house" | "mansion" | "villa";

export type BrowseFilters = {
  mode: ListingMode;
  q: string;
  minPrice: number;
  maxPrice: number;
  beds: string | null;
  baths: string | null;
  propertyType: PropertyTypeFilter;
  minArea: number | null;
  maxArea: number | null;
  sort: ListingSort;
};

export const DEFAULT_BROWSE_FILTERS: BrowseFilters = {
  mode: "sale",
  q: "",
  minPrice: 0,
  maxPrice: 100_000_000,
  beds: null,
  baths: null,
  propertyType: "all",
  minArea: null,
  maxArea: null,
  sort: "newest",
};

export const SALE_PRICE_RANGE = { min: 0, max: 100_000_000, step: 50_000 };
export const RENT_PRICE_RANGE = { min: 0, max: 50_000, step: 500 };

export function priceRangeForListingType(listingType: ListingMode) {
  return listingType === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;
}

export function validateListingPrice(price: number, listingType: ListingMode): string | null {
  const range = priceRangeForListingType(listingType);
  if (!Number.isFinite(price) || price <= 0) {
    return "Enter a valid price greater than zero.";
  }
  if (price > range.max) {
    return listingType === "rent"
      ? `Monthly rent cannot exceed $${range.max.toLocaleString()}.`
      : `Asking price cannot exceed $${range.max.toLocaleString()}.`;
  }
  return null;
}

const PROPERTY_TYPE_KEYWORDS: Record<PropertyTypeFilter, string[]> = {
  all: [],
  house: ["house", "home", "residence", "manor", "family", "mews"],
  mansion: ["mansion", "estate", "pavilion", "palace", "obsidian"],
  villa: ["villa", "villah"],
};

function parseNumberParam(value: string | null): number | null {
  if (!value?.trim()) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function filtersFromSearchParams(params: URLSearchParams): BrowseFilters {
  const mode = params.get("listing_type") === "rent" ? "rent" : "sale";
  const priceRange = mode === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;
  const minPrice = parseNumberParam(params.get("min_price")) ?? priceRange.min;
  const maxPrice = parseNumberParam(params.get("max_price")) ?? priceRange.max;
  const propertyTypeRaw = params.get("property_type");
  const propertyType: PropertyTypeFilter =
    propertyTypeRaw === "house" || propertyTypeRaw === "mansion" || propertyTypeRaw === "villa"
      ? propertyTypeRaw
      : "all";
  const sortRaw = params.get("sort");
  const sort: ListingSort =
    sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest";

  return {
    mode,
    q: params.get("q")?.trim() ?? "",
    minPrice,
    maxPrice,
    beds: params.get("beds"),
    baths: params.get("baths"),
    propertyType,
    minArea: parseNumberParam(params.get("min_area")),
    maxArea: parseNumberParam(params.get("max_area")),
    sort,
  };
}

export function filtersToSearchParams(filters: BrowseFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("listing_type", filters.mode);
  if (filters.q) params.set("q", filters.q);

  const priceRange = filters.mode === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;
  const priceFilterActive =
    filters.minPrice > priceRange.min || filters.maxPrice < priceRange.max;
  if (priceFilterActive) {
    params.set("min_price", String(filters.minPrice));
    params.set("max_price", String(filters.maxPrice));
  }

  if (filters.beds) params.set("beds", filters.beds);
  if (filters.baths) params.set("baths", filters.baths);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.minArea != null) params.set("min_area", String(filters.minArea));
  if (filters.maxArea != null) params.set("max_area", String(filters.maxArea));
  if (filters.sort !== "newest") params.set("sort", filters.sort);

  return params;
}

export function buildListingsApiQuery(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  params.set("listing_type", filters.mode);
  if (filters.q.trim()) params.set("q", filters.q);
  return params.toString();
}

function matchesBedOrBathFilter(value: number, filter: string | null): boolean {
  if (!filter) return true;
  if (filter === "3+") return value >= 3;
  const exact = Number(filter);
  return !Number.isNaN(exact) && value === exact;
}

export type FilterableListing = {
  title: string;
  location: string;
  listingType: ListingMode;
  beds: number;
  baths: number;
  numericPrice: number;
  numericArea: number;
  propertyType?: string;
  description?: string;
};

export function matchesBrowseFilters(listing: FilterableListing, filters: BrowseFilters): boolean {
  if (filters.mode !== listing.listingType) return false;

  if (listing.numericPrice < filters.minPrice || listing.numericPrice > filters.maxPrice) {
    return false;
  }

  if (!matchesBedOrBathFilter(listing.beds, filters.beds)) return false;
  if (!matchesBedOrBathFilter(listing.baths, filters.baths)) return false;

  if (filters.minArea != null && listing.numericArea < filters.minArea) return false;
  if (filters.maxArea != null && listing.numericArea > filters.maxArea) return false;

  if (filters.propertyType !== "all") {
    const haystack = `${listing.title} ${listing.description ?? ""} ${listing.propertyType ?? ""}`.toLowerCase();
    const keywords = PROPERTY_TYPE_KEYWORDS[filters.propertyType];
    if (!keywords.some((kw) => haystack.includes(kw))) return false;
  }

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const haystack = [
      listing.title,
      listing.location,
      listing.description ?? "",
      listing.propertyType ?? "",
      String(listing.beds),
      String(listing.baths),
      String(listing.numericArea),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function sortListingsClient<T extends { numericPrice: number }>(
  listings: T[],
  sort: ListingSort,
): T[] {
  const rows = [...listings];
  if (sort === "price_asc") rows.sort((a, b) => a.numericPrice - b.numericPrice);
  if (sort === "price_desc") rows.sort((a, b) => b.numericPrice - a.numericPrice);
  return rows;
}

export function formatPriceRangeLabel(min: number, max: number, mode: ListingMode): string {
  const fmt = (n: number) => {
    if (mode === "rent") {
      if (n >= 1000) return `$${Math.round(n / 1000)}k`;
      return `$${n.toLocaleString()}`;
    }
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n.toLocaleString()}`;
  };
  return `${fmt(min)} - ${fmt(max)}`;
}

/** True when the user has applied non-default filters (beyond buy/rent mode). */
export function hasRestrictiveFilters(filters: BrowseFilters): boolean {
  const priceRange = filters.mode === "rent" ? RENT_PRICE_RANGE : SALE_PRICE_RANGE;
  return (
    filters.q !== "" ||
    filters.beds !== null ||
    filters.baths !== null ||
    filters.propertyType !== "all" ||
    filters.minArea != null ||
    filters.maxArea != null ||
    filters.minPrice > priceRange.min ||
    filters.maxPrice < priceRange.max
  );
}

export function filterSampleListings<T extends FilterableListing>(
  listings: T[],
  filters: BrowseFilters,
): T[] {
  return listings.filter((l) => matchesBrowseFilters(l, filters));
}
