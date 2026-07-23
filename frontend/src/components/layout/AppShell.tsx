"use client";

import { usePathname } from "next/navigation";
import { StitchMarketFooter } from "@/components/stitch/StitchMarketFooter";
import { StitchMarketHeader } from "@/components/stitch/StitchMarketHeader";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "admin";
};

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
        <StitchMarketHeader />
        <div className="flex-1">{children}</div>
        <StitchMarketFooter />
      </div>
    );
  }

  return <div className="min-h-screen flex flex-col bg-surface">{children}</div>;
}
