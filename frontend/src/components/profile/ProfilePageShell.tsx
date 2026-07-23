"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { StitchMarketFooter } from "@/components/stitch/StitchMarketFooter";
import { StitchMarketHeader } from "@/components/stitch/StitchMarketHeader";
import { ProfileSubNav } from "@/components/profile/profileSections";

type Props = {
  children: ReactNode;
};

export function ProfilePageShell({ children }: Props) {
  const router = useRouter();
  const { loading, token, user } = useAuth();

  useEffect(() => {
    if (!loading && !token) router.replace("/auth/login");
  }, [loading, token, router]);

  if (loading || !token || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <StitchMarketHeader activeNav="profile" />
      <main className="max-w-[800px] mx-auto px-margin-mobile md:px-0 py-12 flex-1 w-full">
        <ProfileSubNav />
        {children}
      </main>
      <StitchMarketFooter />
    </div>
  );
}
