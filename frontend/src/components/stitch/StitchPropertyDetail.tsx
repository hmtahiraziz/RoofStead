"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ListingImageGallery } from "@/components/listings/ListingImageGallery";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount, sellerDashboardPath } from "@/lib/auth/routing";
import { formatPrice } from "@/lib/format/currency";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { getSampleListing, type ListingSeller } from "@/lib/stitch/sample-listings";

type ApiListing = {
  id: string;
  title: string;
  description: string;
  city: string;
  address?: string;
  listingType: "rent" | "sale";
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  areaUnit: string;
  propertyType?: string;
  imageUrl?: string;
  imageUrls?: string[];
  sellerVerified: boolean;
  seller?: {
    id: string;
    name: string;
    avatarUrl?: string;
    verified: boolean;
  } | null;
};

const AMENITY_ICONS: Record<string, string> = {
  Pool: "pool",
  Gym: "fitness_center",
  "Smart Home": "stream_apps",
  "3 Car Garage": "garage",
  Garage: "garage",
  "Wine Cellar": "wine_bar",
  "Solar Panels": "solar_power",
  "24/7 Security": "security",
  Garden: "yard",
  "Pet Friendly": "pets",
};

function defaultSeller(): ListingSeller {
  return {
    name: "Julian Sterling",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ5Mb_kgKY4XpanbSJQskjA2qWbuI0J4HKlDw67tK92CEVuUeuq1zo1buv22m4mxluKT2SzbKZYQjwFimnwF0eeLbcyilFk0XpGLn3xpLwr33OO1XKg0J8ZFqxwvXOGQqYTCmrshinq3uML2E61zT1lflU7WLmCaEwQhRw43_ZRRR77W-yzIa6cxwPflbfGQczhLfi5bLvLvBS8qe3rOwp6ICOlQziQpAZgO5P3p9XDkkJ3Agtjn1_zA",
    verified: true,
    company: "Sterling & Associates Real Estate",
    responseTime: "< 1 hour",
    activeListings: 12,
  };
}

function sampleToListing(sample: NonNullable<ReturnType<typeof getSampleListing>>): ApiListing {
  return {
    id: sample.id,
    title: sample.title,
    description: sample.description ?? "",
    city: sample.location,
    address: sample.address,
    listingType: sample.listingType,
    price: sample.numericPrice,
    currency: "USD",
    bedrooms: sample.beds,
    bathrooms: sample.baths,
    area: sample.numericArea,
    areaUnit: "sqft",
    propertyType: sample.propertyType,
    imageUrl: sample.imageUrl,
    imageUrls: sample.imageUrls ?? [sample.imageUrl],
    sellerVerified: sample.verified,
  };
}

export function StitchPropertyDetail({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<ApiListing | null>(null);
  const [isLiveListing, setIsLiveListing] = useState(false);
  const [seller, setSeller] = useState<ListingSeller>(defaultSeller());
  const [amenities, setAmenities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && isSellerAccount(user)) {
      router.replace(sellerDashboardPath());
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ listing: ApiListing }>(`/api/listings/${listingId}`)
      .then((data) => {
        if (cancelled) return;
        setListing(data.listing);
        setIsLiveListing(true);
        if (data.listing.seller) {
          setSeller({
            name: data.listing.seller.name,
            avatarUrl: data.listing.seller.avatarUrl ?? defaultSeller().avatarUrl,
            verified: data.listing.seller.verified,
            company: "RoofStead Premier Broker",
            responseTime: "< 1 hour",
            activeListings: 12,
          });
        }
        setAmenities([]);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        const sample = getSampleListing(listingId);
        if (sample) {
          setListing(sampleToListing(sample));
          setIsLiveListing(false);
          setSeller(sample.seller ?? defaultSeller());
          setAmenities(sample.amenities ?? []);
          setError(null);
          return;
        }
        setListing(null);
        setIsLiveListing(false);
        setError("Listing not found");
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function openListingChat() {
    setContactError(null);

    if (!isLiveListing || !listing) {
      setContactError(
        "This is a preview listing. Message a seller from a live property listed on RoofStead.",
      );
      return;
    }

    if (!token) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }

    setContacting(true);
    try {
      const isOwnListing = Boolean(user?.id && listing.seller?.id === user.id);
      const res = await apiFetch<{ conversationId: string; existing?: boolean }>(
        "/api/messages/conversations",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            listingId: listing.id,
            ...(isOwnListing
              ? {}
              : { message: `Hi, I'm interested in ${listing.title}.` }),
          }),
        },
      );
      router.push(`/messages?conversation=${encodeURIComponent(res.conversationId)}`);
    } catch (e) {
      setContactError(e instanceof Error ? e.message : "Could not open conversation");
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

  const images =
    listing.imageUrls && listing.imageUrls.length > 0
      ? listing.imageUrls
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];
  const priceLabel =
    listing.listingType === "rent"
      ? `${formatPrice(listing.price, listing.currency as CurrencyCode)}/mo`
      : formatPrice(listing.price, listing.currency as CurrencyCode);
  const locationLine = [listing.address, listing.city].filter(Boolean).join(", ");
  const areaLabel =
    listing.areaUnit === "sqm" ? `${listing.area.toLocaleString()} m²` : `${listing.area.toLocaleString()} sq ft`;
  const isOwnListing = Boolean(user?.id && listing.seller?.id === user.id);
  const primaryChatLabel = isOwnListing ? "View inquiries" : "Contact Seller";

  return (
    <main className="max-w-[1440px] mx-auto overflow-hidden pt-6 md:pt-10 px-margin-mobile md:px-margin-desktop">
      <ListingImageGallery
        aspectClass="aspect-[21/9] md:aspect-[21/7]"
        images={images}
        priority
        roundedClass="rounded-xl md:rounded-2xl"
        showThumbnails={images.length > 1}
      />

      <div className="px-0 md:px-0 py-12 grid grid-cols-1 lg:grid-cols-12 gap-gutter max-w-container-max mx-auto">
        <div className="lg:col-span-8 space-y-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-primary-container text-white font-label-md text-label-md rounded-full uppercase tracking-wider">
                {listing.listingType === "rent" ? "For Rent" : "For Sale"}
              </span>
              {listing.sellerVerified && (
                <div className="flex items-center text-primary font-label-md text-label-md font-bold">
                  <span
                    className="material-symbols-outlined text-[16px] mr-1"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  Verified Listing
                </div>
              )}
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface">{listing.title}</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              {locationLine || listing.city}
            </p>
            <div className="font-display-lg text-display-lg text-primary mt-4">{priceLabel}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-xl ambient-shadow border border-outline-variant/30">
            {[
              { label: "Beds", icon: "bed", value: listing.bedrooms },
              { label: "Baths", icon: "bathtub", value: listing.bathrooms },
              { label: "Sq Ft", icon: "square_foot", value: areaLabel },
              { label: "Type", icon: "home", value: listing.propertyType ?? "House" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={`flex flex-col ${index < 3 ? "border-r border-outline-variant pr-4" : "pl-4"}`}
              >
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                  {stat.label}
                </span>
                <span className="font-title-lg text-title-lg text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">{stat.icon}</span>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface border-b border-outline-variant pb-4">
              About this property
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              {listing.description || "No description provided."}
            </p>
          </div>

          {amenities.length > 0 && (
            <div className="space-y-6">
              <h2 className="font-headline-sm text-headline-sm text-on-surface border-b border-outline-variant pb-4">
                Amenities
              </h2>
              <div className="flex flex-wrap gap-3">
                {amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-4 py-2 bg-surface-container-low text-on-surface-variant font-body-md text-body-md rounded-full flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      {AMENITY_ICONS[amenity] ?? "check_circle"}
                    </span>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-28 space-y-6">
            <div className="bg-white rounded-2xl p-8 ambient-shadow border border-outline-variant/30 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface-container-low">
                  <Image
                    alt={seller.name}
                    className="w-full h-full object-cover"
                    height={96}
                    src={seller.avatarUrl}
                    unoptimized
                    width={96}
                  />
                </div>
                {seller.verified && (
                  <div className="absolute bottom-0 right-0 bg-primary-container text-white rounded-full p-1 border-2 border-white">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      shield
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1 mb-6">
                <h3 className="font-title-lg text-title-lg text-on-surface">{seller.name}</h3>
                {seller.verified && (
                  <div className="flex items-center justify-center gap-1 text-primary font-label-md text-label-md">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    Verified Premier Broker
                  </div>
                )}
                {seller.company && (
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mt-2">
                    {seller.company}
                  </p>
                )}
              </div>
              <div className="w-full space-y-3">
                {contactError && (
                  <p className="text-body-md text-error text-left px-1">{contactError}</p>
                )}
                {!isLiveListing && (
                  <p className="text-body-md text-on-surface-variant text-left px-1">
                    Preview listing — messaging is available on live properties only.
                  </p>
                )}
                <button
                  className="w-full py-4 bg-primary text-white rounded-xl font-title-lg text-title-lg hover:opacity-95 transition-all shadow-md active:scale-95 disabled:opacity-60"
                  disabled={contacting || !isLiveListing}
                  type="button"
                  onClick={openListingChat}
                >
                  {contacting ? "Opening chat…" : primaryChatLabel}
                </button>
                {!isOwnListing && (
                  <button
                    className="w-full py-4 bg-transparent border border-primary text-primary rounded-xl font-title-lg text-title-lg hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50"
                    disabled={contacting || !isLiveListing}
                    type="button"
                    onClick={openListingChat}
                  >
                    Schedule a Tour
                  </button>
                )}
              </div>
              <div className="mt-8 pt-8 border-t border-outline-variant w-full flex justify-between">
                <div className="text-left">
                  <p className="font-label-md text-label-md text-on-surface-variant">Response Time</p>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">
                    {seller.responseTime ?? "< 1 hour"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-label-md text-label-md text-on-surface-variant">Listings</p>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">
                    {seller.activeListings ?? 12} Active
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30">
              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-4">
                Market Insight
              </h4>
              <div className="flex items-end gap-2 mb-2">
                <span className="font-headline-sm text-headline-sm text-primary">+4.2%</span>
                <span className="font-label-md text-label-md text-on-surface-variant pb-1">
                  Area growth this year
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {listing.city.split(",")[0]} continues to show strong appreciation for architecturally unique
                properties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
