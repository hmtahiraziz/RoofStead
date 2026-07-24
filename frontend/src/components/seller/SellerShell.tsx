"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserAccountMenu } from "@/components/stitch/UserAccountMenu";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export function SellerShell({ children, title }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navClass = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
      ? "font-label-md text-label-md text-primary border-b-2 border-primary pb-0.5"
      : "font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors pb-0.5";

  return (
    <div className="bg-background text-on-surface font-body-lg min-h-screen flex flex-col">
      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto gap-4">
          <div className="flex items-center gap-6 md:gap-8 min-w-0">
            <Link className="shrink-0" href="/seller">
              <Image alt="RoofStead Logo" className="h-10 w-auto" height={40} src={STITCH_LOGO_SRC} width={120} />
            </Link>
            <div className="hidden sm:flex items-center gap-6">
              <Link className={navClass("/seller")} href="/seller">
                My Listings
              </Link>
              <Link className={navClass("/seller/post")} href="/seller/post">
                Post Listing
              </Link>
              <Link className={navClass("/messages")} href="/messages">
                Messages
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user && <UserAccountMenu />}
          </div>
        </nav>
      </header>

      {title && (
        <div className="border-b border-outline-variant/40 bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">
            <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-8">
        {children}
      </main>
    </div>
  );
}
