"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { StitchMarketFooter } from "@/components/stitch/StitchMarketFooter";
import { StitchMarketHeader } from "@/components/stitch/StitchMarketHeader";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "admin";
};

function HeaderFallback() {
  return <div className="h-[5.5rem] bg-surface border-b border-outline-variant" aria-hidden />;
}

function useChrome(pathname: string) {
  if (pathname.startsWith("/auth/")) return "bare";
  if (
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seller")
  ) {
    return "bare";
  }
  if (pathname === "/" || pathname.startsWith("/listings")) return "market";
  return "bare";
}

export function AppShell({ children, variant = "default" }: Props) {
  const pathname = usePathname();
  const chrome = variant === "admin" ? "bare" : useChrome(pathname);

  if (chrome === "market") {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <Suspense fallback={<HeaderFallback />}>
          <StitchMarketHeader />
        </Suspense>
        <div className="flex-1">{children}</div>
        <StitchMarketFooter />
      </div>
    );
  }

  return <div className="min-h-screen flex flex-col bg-surface">{children}</div>;
}
