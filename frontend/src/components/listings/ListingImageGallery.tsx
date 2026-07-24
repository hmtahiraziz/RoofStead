"use client";

import Image from "next/image";
import { useState } from "react";

const DEFAULT_PLACEHOLDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAWGVRWPTmP406LprVAQpFfAPTBz2YXexOSGrwjZoO-Z1iSrjkaPioEeC4EWWhMthKWCWL-Lo-nr-AQRTQj_3vAuNScH9n_7DFUpro0WDJHbYPgv1j8wAbpa_QrJOHZsCBnWQKVb67Pn7dgD6PRRpU0huTva2daMUbblCQj5ItlksLXQf0BLoIlwU2KhTvGz5U4cDTQ4aZMJCF0pyKQ04M6kX6IPobpMCEVV5wkIVrfWMxf4yus2GY0NkyCTE-d4stPbzFYBwjnYpm0";

type ListingImageGalleryProps = {
  images: string[];
  placeholder?: string;
  aspectClass?: string;
  roundedClass?: string;
  showThumbnails?: boolean;
  showCounter?: boolean;
  priority?: boolean;
  emptyLabel?: string;
};

export function ListingImageGallery({
  images,
  placeholder = DEFAULT_PLACEHOLDER,
  aspectClass = "aspect-[16/10]",
  roundedClass = "rounded-xl",
  showThumbnails = true,
  showCounter = true,
  priority = false,
  emptyLabel = "No photo",
}: ListingImageGalleryProps) {
  const [index, setIndex] = useState(0);
  const slides = images.filter(Boolean);
  const hasSlides = slides.length > 0;
  const active = hasSlides ? (slides[index] ?? slides[0]) : placeholder;
  const canNavigate = slides.length > 1;

  function goPrev() {
    setIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
  }

  function goNext() {
    setIndex((i) => (i + 1) % slides.length);
  }

  return (
    <section className={`overflow-hidden border border-outline-variant bg-surface-container-lowest ${roundedClass}`}>
      <div className={`group relative ${aspectClass} bg-surface-container-high`}>
        {hasSlides ? (
          <Image
            alt=""
            className="object-cover"
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 66vw"
            src={active}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl">home</span>
            <span className="sr-only">{emptyLabel}</span>
          </div>
        )}

        {canNavigate && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              aria-label="Previous photo"
              onClick={goPrev}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              aria-label="Next photo"
              onClick={goNext}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </>
        )}

        {canNavigate && showCounter && (
          <div className="absolute bottom-3 right-3 rounded-lg bg-black/50 px-3 py-1 font-label-md text-label-md text-white backdrop-blur-sm">
            {index + 1} / {slides.length}
          </div>
        )}
      </div>

      {canNavigate && showThumbnails && (
        <div className="flex gap-2 overflow-x-auto border-t border-outline-variant p-3">
          {slides.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"
              }`}
              aria-label={`View photo ${i + 1}`}
              onClick={() => setIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={url} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
