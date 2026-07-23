"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/profile", label: "Profile", match: (path: string) => path === "/profile" },
  {
    href: "/profile/settings",
    label: "Settings",
    match: (path: string) => path === "/profile/settings",
  },
  {
    href: "/profile/security",
    label: "Security",
    match: (path: string) => path === "/profile/security",
  },
] as const;

export function ProfileSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Profile sections"
      className="flex flex-wrap gap-2 mb-10 p-1 bg-surface-container-low rounded-xl border border-outline-variant"
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex-1 min-w-[7rem] text-center px-4 py-2.5 rounded-lg font-label-md text-primary bg-surface-container-lowest shadow-sm border border-outline-variant/50"
                : "flex-1 min-w-[7rem] text-center px-4 py-2.5 rounded-lg font-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high/80 transition-colors"
            }
            href={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
