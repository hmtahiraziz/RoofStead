"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserAccountMenu } from "@/components/stitch/UserAccountMenu";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type Props = {
  activeNav?: "properties" | "messages" | "profile";
};

export function StitchMarketHeader({ activeNav = "properties" }: Props) {
  const { user, loading } = useAuth();

  const navClass = (key: Props["activeNav"]) =>
    key === activeNav
      ? "font-label-md text-label-md text-primary border-b-2 border-primary pb-1"
      : "font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors";

  return (
    <header className="bg-surface sticky top-0 z-50 shadow-sm transition-all duration-200">
      <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-2" href="/">
            <Image
              alt="RoofStead Logo"
              className="h-14 w-auto md:h-16 shrink-0"
              height={64}
              src={STITCH_LOGO_SRC}
              style={{ width: "auto", height: "auto", maxHeight: "4rem" }}
              width={200}
              priority
            />
          </Link>
          <div className="hidden md:flex relative items-center bg-surface-container-low rounded-full px-4 py-2 border border-outline-variant focus-within:border-primary-container transition-all w-80">
            <span className="material-symbols-outlined text-on-surface-variant text-xl mr-2">
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md w-full placeholder-on-surface-variant outline-none"
              placeholder="Search properties..."
              type="search"
            />
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Main">
          <Link className={navClass("properties")} href="/listings">
            Properties
          </Link>
          {user && (
            <Link className={navClass("messages")} href="/messages">
              Messages
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!loading && !user && (
            <>
              <Link
                className="hidden md:block font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors px-4 py-2"
                href="/auth/login"
              >
                Sign In
              </Link>
              <Link
                className="bg-primary-container text-on-primary text-label-md font-label-md px-6 py-3 rounded-lg hover:bg-primary transition-all active:scale-95"
                href="/auth/signup"
              >
                Sign up
              </Link>
            </>
          )}
          {!loading && user && (
            <>
              <Link
                className="hidden md:block font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors px-4 py-2 border border-outline-variant rounded-lg hover:border-primary"
                href="/seller/post"
              >
                List Property
              </Link>
              <UserAccountMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
