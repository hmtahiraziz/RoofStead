"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/api/client";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { STITCH_BROWSE_LISTINGS } from "@/lib/stitch/sample-listings";

type ApiListing = {
  id: string;
  title: string;
  description: string;
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

function sampleToApiListing(sample: (typeof STITCH_BROWSE_LISTINGS)[number]): ApiListing {
  const numericPrice = Number(sample.price.replace(/[^0-9.]/g, "")) || 0;
  const sqftMatch = sample.sqft.match(/([\d,]+)/);
  const area = sqftMatch ? Number(sqftMatch[1].replace(/,/g, "")) : 0;
  return {
    id: sample.id,
    title: sample.title,
    description: `Stitch showcase property in ${sample.location}.`,
    city: sample.location,
    listingType: sample.listingType,
    price: numericPrice,
    currency: "USD",
    bedrooms: sample.beds,
    bathrooms: sample.baths,
    area,
    areaUnit: "sqft",
    imageUrl: sample.imageUrl,
    sellerVerified: sample.verified,
  };
}

export function StitchPropertyDetail({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const [listing, setListing] = useState<ApiListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    const sample = STITCH_BROWSE_LISTINGS.find((l) => l.id === listingId);
    if (sample) {
      setListing(sampleToApiListing(sample));
      setError(null);
      return;
    }
    apiFetch<{ listing: ApiListing }>(`/api/listings/${listingId}`)
      .then((data) => {
        setListing(data.listing);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Not found"));
  }, [listingId]);

  async function messageSeller() {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    setContacting(true);
    try {
      const res = await apiFetch<{ conversationId: string }>("/api/messages/conversations", {
        method: "POST",
        token,
        body: JSON.stringify({
          listingId,
          message: `Hi, I'm interested in ${listing?.title}.`,
        }),
      });
      router.push("/messages");
      void res.conversationId;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start conversation");
    } finally {
      setContacting(false);
    }
  }

  if (error && !listing) {
    return (
      <main className="max-w-container-max mx-auto px-margin-desktop py-16">
        <p className="text-center text-on-surface-variant">{error}</p>
        <p className="text-center mt-4">
          <Link className="text-primary font-label-md" href="/listings">
            Back to browse
          </Link>
        </p>
      </main>
    );
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant">
        Loading property…
      </div>
    );
  }

  const priceLabel =
    listing.listingType === "rent"
      ? `${formatPrice(listing.price, listing.currency as CurrencyCode)}/mo`
      : formatPrice(listing.price, listing.currency as CurrencyCode);

  return (
    <main className="max-w-container-max mx-auto px-margin-desktop py-10 grid lg:grid-cols-2 gap-gutter">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden card-shadow bg-surface-container-high">
          {listing.imageUrl ? (
            <Image alt="" className="object-cover" fill src={listing.imageUrl} sizes="50vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">No photo</div>
          )}
        </div>
        <div>
          <div className="flex gap-2 mb-4">
            {listing.sellerVerified && (
              <span className="bg-primary-container text-on-primary text-label-md px-3 py-1 rounded-full">Verified</span>
            )}
            <span className="bg-surface-container-high px-3 py-1 rounded-full text-label-md">
              {listing.listingType === "rent" ? "For rent" : "For sale"}
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-primary mb-2">{listing.title}</h1>
          <p className="font-title-lg text-title-lg text-primary mb-4">{priceLabel}</p>
          <p className="text-on-surface-variant font-body-md mb-6 flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">location_on</span>
            {listing.city}
          </p>
          <p className="font-body-lg text-on-surface mb-8">{listing.description || "No description provided."}</p>
          <div className="flex gap-6 text-on-surface-variant mb-8">
            <span>{listing.bedrooms} bed</span>
            <span>{listing.bathrooms} bath</span>
            <span>
              {listing.area} {listing.areaUnit === "sqm" ? "m²" : "sq ft"}
            </span>
          </div>
          <button
            className="bg-primary text-on-primary px-8 py-3 rounded-lg font-label-md hover:bg-primary-container transition-all disabled:opacity-60"
            disabled={contacting}
            type="button"
            onClick={messageSeller}
          >
            {contacting ? "Opening chat…" : "Message seller"}
          </button>
        </div>
    </main>
  );
}
