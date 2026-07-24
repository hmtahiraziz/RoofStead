"use client";

import { useRef, useState } from "react";
import { apiUpload } from "@/lib/api/client";

const MAX_IMAGES = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ListingImageUploaderProps = {
  token: string;
  images: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

export function ListingImageUploader({ token, images, onChange, disabled }: ListingImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    const invalid = files.find((f) => !ACCEPTED_TYPES.includes(f.type));
    if (invalid) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of files) {
        form.append("files", file);
      }
      const res = await apiUpload<{ urls: string[] }>("/api/seller/listings/upload", form, token);
      onChange([...images, ...res.urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload images");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        disabled={disabled || uploading || images.length >= MAX_IMAGES}
        multiple
        type="file"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div
        className={`border-2 border-dashed border-outline-variant rounded-xl p-8 text-center bg-surface transition-all ${
          disabled || uploading || images.length >= MAX_IMAGES
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-surface-container-low cursor-pointer group"
        }`}
        onClick={() => {
          if (!disabled && !uploading && images.length < MAX_IMAGES) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) void handleFiles(e.dataTransfer.files);
        }}
        role="presentation"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">add_a_photo</span>
          </div>
          <div>
            <p className="font-title-lg text-title-lg text-primary">
              {uploading ? "Uploading…" : "Drag and drop images here"}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              JPG, PNG, or WebP — up to {MAX_IMAGES} photos ({images.length}/{MAX_IMAGES})
            </p>
          </div>
          <button
            className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md text-label-md hover:opacity-90 transition-all disabled:opacity-60"
            disabled={disabled || uploading || images.length >= MAX_IMAGES}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {uploading ? "Uploading…" : "Select Files"}
          </button>
        </div>
      </div>

      {error && <p className="text-error text-sm">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-outline-variant">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={url} />
              <button
                type="button"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label={`Remove photo ${i + 1}`}
                disabled={disabled || uploading}
                onClick={() => removeImage(i)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              {i === 0 && (
                <span className="absolute bottom-2 left-2 rounded bg-primary px-2 py-0.5 font-label-md text-[10px] uppercase text-on-primary">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
