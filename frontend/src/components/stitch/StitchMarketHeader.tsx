"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserAccountMenu } from "@/components/stitch/UserAccountMenu";
import { filtersFromSearchParams, filtersToSearchParams } from "@/lib/listings/filters";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type Props = {
  activeNav?: "properties" | "messages" | "profile";
};

export function StitchMarketHeader({ activeNav = "properties" }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchDraft, setSearchDraft] = useState("");

  useEffect(() => {
    const filters = filtersFromSearchParams(searchParams);
    setSearchDraft(filters.q);
  }, [searchParams]);

  const navClass = (key: Props["activeNav"]) =>
    key === activeNav
      ? "font-label-md text-label-md text-primary border-b-2 border-primary pb-0.5"
      : "font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors pb-0.5";

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const filters = filtersFromSearchParams(searchParams);
    filters.q = searchDraft.trim();
    const params = filtersToSearchParams(filters);
    const qs = params.toString();
    const target = pathname.startsWith("/listings") || pathname === "/" ? pathname : "/listings";
    router.push(qs ? `${target}?${qs}` : target);
  }

  return (
    <header className="bg-surface sticky top-0 z-50 border-b border-outline-variant/40 shadow-sm">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex items-center gap-3 md:gap-5 lg:gap-6 min-h-[4.25rem] md:min-h-[4.75rem] py-2">
          <Link className="flex items-center shrink-0 self-center" href="/">
            <Image
              alt="RoofStead Logo"
              className="h-12 w-auto md:h-14 lg:h-16"
              height={64}
              src={STITCH_LOGO_SRC}
              style={{ width: "auto", height: "auto", maxHeight: "4rem" }}
              width={280}
              priority
            />
          </Link>

          <form
            className="hidden md:flex items-center flex-1 min-w-0 max-w-[220px] lg:max-w-[300px] xl:max-w-[340px] h-10 bg-surface-container-low rounded-full px-4 border border-outline-variant focus-within:border-primary-container transition-all"
            onSubmit={submitSearch}
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl shrink-0">
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md w-full min-w-0 placeholder-on-surface-variant outline-none ml-2"
              placeholder="Search by size, house, mansion, villa…"
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-3 lg:gap-5 ml-auto shrink-0">
            <nav className="hidden lg:flex items-center gap-6 h-10" aria-label="Main">
              <Link className={`${navClass("properties")} inline-flex items-center h-full`} href="/listings">
                Properties
              </Link>
              {user && (
                <Link className={`${navClass("messages")} inline-flex items-center h-full`} href="/messages">
                  Messages
                </Link>
              )}
            </nav>

            <div className="hidden lg:block h-6 w-px bg-outline-variant" aria-hidden />

            <div className="flex items-center gap-2 lg:gap-3">
              {!loading && !user ? (
                <>
                  <Link
                    className="hidden md:inline-flex items-center h-10 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors px-3"
                    href="/auth/login"
                  >
                    Sign In
                  </Link>
                  <Link
                    className="inline-flex items-center h-10 bg-primary-container text-on-primary text-label-md font-label-md px-5 rounded-lg hover:bg-primary transition-all active:scale-95 whitespace-nowrap"
                    href="/auth/signup"
                  >
                    Sign up
                  </Link>
                </>
              ) : null}
              {!loading && user ? (
                <>
                  <Link
                    className="hidden md:inline-flex items-center h-10 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors px-4 border border-outline-variant rounded-lg hover:border-primary whitespace-nowrap"
                    href="/seller/post"
                  >
                    List Property
                  </Link>
                  <UserAccountMenu />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
