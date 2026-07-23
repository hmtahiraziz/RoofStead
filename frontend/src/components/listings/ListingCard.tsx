import Link from "next/link";
import { formatPrice } from "@/lib/format/currency";
import type { ListingSummary } from "@/lib/types/listing";
import styles from "./ListingCard.module.css";

type Props = {
  listing: ListingSummary;
};

export function ListingCard({ listing }: Props) {
  const priceLabel =
    listing.listingType === "rent"
      ? `${formatPrice(listing.price, listing.currency)}/mo`
      : formatPrice(listing.price, listing.currency);

  const areaLabel =
    listing.areaUnit === "sqm" ? `${listing.area} m²` : `${listing.area} sq ft`;

  return (
    <article className={styles.card}>
      <Link href={`/listings/${listing.id}`} className={styles.media}>
        <div className={styles.mediaPlaceholder} aria-hidden />
        <div className={styles.badges}>
          <span className={listing.listingType === "rent" ? styles.badgeRent : styles.badgeSale}>
            {listing.listingType === "rent" ? "For rent" : "For sale"}
          </span>
          {listing.sellerVerified && (
            <span className={styles.badgeVerified}>Verified seller</span>
          )}
        </div>
      </Link>
      <div className={styles.body}>
        <p className={styles.price}>{priceLabel}</p>
        <h3 className={styles.title}>
          <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
        </h3>
        <p className={styles.meta}>
          {listing.city} · {listing.bedrooms} bed · {listing.bathrooms} bath · {areaLabel}
        </p>
      </div>
    </article>
  );
}
