import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserAuth } from "../middleware/auth";
import {
  createListing,
  findListingById,
  findUserById,
  listActiveListings,
  type ListingRecord,
  type ListingSort,
} from "../lib/airtable/repositories";
import { isPriceWithinRange, priceRangeError } from "../lib/listings/priceRanges";

export const listingsRouter = Router();

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function parseBedBathQuery(value: unknown): { exact?: number; minimum?: number } {
  if (typeof value !== "string" || !value.trim()) return {};
  if (value === "3+") return { minimum: 3 };
  if (value === "1" || value === "2") return { exact: Number(value) };
  const n = Number(value);
  return Number.isNaN(n) ? {} : { exact: n };
}

function parseListingSort(value: unknown): ListingSort | undefined {
  if (value === "newest" || value === "price_asc" || value === "price_desc") return value;
  return undefined;
}

function inferPropertyType(listing: ListingRecord): string {
  const haystack = `${listing.title} ${listing.description ?? ""}`.toLowerCase();
  if (haystack.includes("villa") || haystack.includes("villah")) return "Villa";
  if (haystack.includes("mansion") || haystack.includes("estate") || haystack.includes("pavilion")) {
    return "Mansion";
  }
  if (haystack.includes("penthouse") || haystack.includes("loft")) return "Penthouse";
  return "House";
}

function toPublicListing(listing: ListingRecord, sellerVerified: boolean) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description ?? "",
    city: listing.city,
    address: listing.address ?? "",
    listingType: listing.listing_type,
    price: listing.price,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    area: listing.area,
    areaUnit: listing.area_unit,
    propertyType: inferPropertyType(listing),
    imageUrl: listing.image_urls[0],
    imageUrls: listing.image_urls,
    sellerVerified,
  };
}

async function sellerIsVerified(sellerId: string) {
  const seller = await findUserById(sellerId);
  return seller?.verification_status === "verified";
}

listingsRouter.get("/", async (req, res) => {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const listing_type =
      req.query.listing_type === "rent" || req.query.listing_type === "sale"
        ? req.query.listing_type
        : undefined;
    const search =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.query.search === "string"
          ? req.query.search
          : undefined;
    const property_type =
      typeof req.query.property_type === "string" ? req.query.property_type : undefined;
    const bedFilter = parseBedBathQuery(req.query.beds);
    const bathFilter = parseBedBathQuery(req.query.baths);

    const rows = await listActiveListings({
      city,
      listing_type,
      min_price: parseOptionalNumber(req.query.min_price),
      max_price: parseOptionalNumber(req.query.max_price),
      bedrooms: bedFilter.exact,
      min_bedrooms: bedFilter.minimum,
      bathrooms: bathFilter.exact,
      min_bathrooms: bathFilter.minimum,
      min_area: parseOptionalNumber(req.query.min_area),
      max_area: parseOptionalNumber(req.query.max_area),
      search,
      property_type,
      sort: parseListingSort(req.query.sort),
    });
    const listings = await Promise.all(
      rows.map(async (row) => toPublicListing(row, await sellerIsVerified(row.seller_id))),
    );
    res.json({ listings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load listings" });
  }
});

listingsRouter.get("/:id", async (req, res) => {
  try {
    const listing = await findListingById(String(req.params.id));
    if (!listing || listing.status !== "active") {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const seller = await findUserById(listing.seller_id);
    const verified = seller?.verification_status === "verified";
    res.json({
      listing: {
        ...toPublicListing(listing, verified),
        seller: seller
          ? {
              id: seller.id,
              name: seller.name,
              avatarUrl: seller.profile_picture_url,
              verified,
            }
          : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load listing" });
  }
});

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  listing_type: z.enum(["rent", "sale"]),
  price: z.number().positive(),
  currency: z.string().min(3).max(3),
  city: z.string().min(1),
  address: z.string().optional(),
  area: z.number().positive(),
  area_unit: z.enum(["sqft", "sqm"]),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  image_urls: z.array(z.string().url()).optional(),
});

listingsRouter.post("/", requireUserAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const seller = await findUserById(req.userId!);
  if (!seller || seller.verification_status !== "verified") {
    res.status(403).json({ error: "Seller verification required before publishing" });
    return;
  }

  const data = parsed.data;
  if (!isPriceWithinRange(data.price, data.listing_type)) {
    res.status(400).json({ error: priceRangeError(data.listing_type) });
    return;
  }

  try {
    const created = await createListing({
      seller: [req.userId!],
      title: data.title,
      description: data.description ?? "",
      listing_type: data.listing_type,
      price: data.price,
      currency: data.currency.toUpperCase(),
      city: data.city,
      address: data.address ?? "",
      area: data.area,
      area_unit: data.area_unit,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      image_urls: JSON.stringify(data.image_urls ?? []),
      status: "active",
      view_count: 0,
      inquiry_count: 0,
    });

    res.status(201).json({
      listing: toPublicListing(created, true),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create listing" });
  }
});
