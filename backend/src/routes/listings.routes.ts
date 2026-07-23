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
} from "../lib/airtable/repositories";

export const listingsRouter = Router();

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
    const min_price =
      typeof req.query.min_price === "string" ? Number(req.query.min_price) : undefined;

    const rows = await listActiveListings({ city, listing_type, min_price });
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
    const verified = await sellerIsVerified(listing.seller_id);
    res.json({ listing: toPublicListing(listing, verified) });
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

  try {
    const data = parsed.data;
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
