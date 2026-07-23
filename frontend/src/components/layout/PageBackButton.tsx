"use client";

import { useRouter } from "next/navigation";

type Props = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export function PageBackButton({ fallbackHref = "/listings", label = "Back", className = "" }: Props) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      className={`inline-flex items-center gap-1 text-primary font-label-md hover:underline ${className}`}
      type="button"
      onClick={goBack}
    >
      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      {label}
    </button>
  );
}
