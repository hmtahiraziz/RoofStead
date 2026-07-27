"use client";

import Image from "next/image";
import Link from "next/link";
import type { StitchBrowseListing } from "@/lib/stitch/sample-listings";

type Props = {
  listing: StitchBrowseListing;
};

export function StitchListingCard({ listing }: Props) {
  const typeLabel = listing.listingType === "rent" ? "For Rent" : "For Sale";

  return (
    <article className="group bg-white rounded-2xl overflow-hidden card-shadow transition-transform hover:-translate-y-1 duration-300">
      <Link className="relative block aspect-[4/3] overflow-hidden" href={`/listings/${listing.id}`}>
        <Image
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={listing.imageUrl}
          unoptimized
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {listing.verified && (
            <span className="bg-primary-container text-on-primary text-label-md font-label-md px-3 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-sm fill-icon">verified</span>
              Verified
            </span>
          )}
          <span className="bg-white/90 backdrop-blur-md text-primary text-label-md font-label-md px-3 py-1 rounded-full">
            {typeLabel}
          </span>
        </div>
        <button
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary hover:text-red-500 transition-colors"
          type="button"
          onClick={(e) => e.preventDefault()}
          aria-label="Save listing"
        >
          <span className="material-symbols-outlined">favorite</span>
        </button>
      </Link>
      <div className="p-6">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h2 className="font-headline-sm text-headline-sm text-primary">{listing.title}</h2>
          <p className="font-title-lg text-title-lg text-primary whitespace-nowrap">
            {listing.price}
            {listing.listingType === "rent" && (
              <span className="text-body-md font-normal">/mo</span>
            )}
          </p>
        </div>
        <p className="text-body-md text-on-surface-variant flex items-center gap-1 mb-6">
          <span className="material-symbols-outlined text-lg">location_on</span>
          {listing.location}
        </p>
        <div className="flex items-center justify-between pt-6 border-t border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">bed</span>
              <span className="text-label-md font-label-md">{listing.beds}</span>
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">bathtub</span>
              <span className="text-label-md font-label-md">{listing.baths}</span>
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">square_foot</span>
              <span className="text-label-md font-label-md">{listing.sqft}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
