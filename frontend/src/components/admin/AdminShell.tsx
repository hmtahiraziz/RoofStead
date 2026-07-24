"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAdminAuth } from "@/components/auth/AdminProvider";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

export type AdminSection = "dashboard" | "users" | "verification" | "listings";

type AdminShellProps = {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  adminName?: string;
  adminRole?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showTopSearch?: boolean;
  children: ReactNode;
};

const ADMIN_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA9_uUo49AkKYfp4aylpbBneQWgwtLe1iTr7Poi1xzDZ42jw_hbWj9BjNZzwDyL-9Qsfl4t_kaLEEdhha-vEdE4XChQ8hEHZ7XY-djzmvK0TzIDRoX_CbLy9be8NOtP4nmBZVY1BMDzKudLL_teE5-lrHNUYQMhEe09hZNLgVTyvT8umHBb89c8GNxNyatFVLvp_okd9vsRKthvOj-rArLvKBccDnn3Lc7b6MD9bb4TVes1_rwJCd0E4Qf2vaMA0n3AHATn85BXvJSc";

function NavLink({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "flex w-full items-center gap-3 rounded-lg bg-primary-container px-4 py-3 font-body-md text-body-md font-medium text-on-primary-container transition-all duration-200 active:scale-95"
          : "flex w-full items-center gap-3 rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high active:scale-95"
      }
      type="button"
      onClick={onClick}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

export function AdminShell({
  section,
  onSectionChange,
  adminName,
  adminRole,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  showTopSearch = false,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const { logout: adminLogout } = useAdminAuth();

  const roleLabel =
    adminRole === "super_admin" ? "Super Admin" : adminRole?.replace(/_/g, " ") ?? "Global Controller";

  return (
    <div className="flex min-h-screen bg-background font-body-md text-on-background">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface px-4 py-margin-mobile shadow-sm md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Image
            alt=""
            className="h-10 w-10 rounded-full border border-outline-variant object-cover"
            height={40}
            src={ADMIN_AVATAR}
            unoptimized
            width={40}
          />
          <div>
            <h1 className="font-headline-sm text-headline-sm text-primary">EstateAdmin</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavLink
            active={section === "dashboard"}
            icon="dashboard"
            label="Dashboard"
            onClick={() => onSectionChange("dashboard")}
          />
          <NavLink
            active={section === "users"}
            icon="group"
            label="Users"
            onClick={() => onSectionChange("users")}
          />
          <NavLink
            active={section === "verification"}
            icon="verified_user"
            label="Verification"
            onClick={() => onSectionChange("verification")}
          />
          <NavLink
            active={section === "listings"}
            icon="apartment"
            label="Listings"
            onClick={() => onSectionChange("listings")}
          />
        </nav>

        <div className="mt-auto space-y-2 border-t border-outline-variant pt-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
            type="button"
            onClick={() => {
              void adminLogout().then(() => router.push("/admin/login"));
            }}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        <header className="fixed left-0 right-0 top-0 z-10 hidden h-16 items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:left-64 md:flex md:px-margin-desktop">
          {showTopSearch ? (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-64 rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 font-body-md text-body-md transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={searchPlaceholder}
                type="search"
                value={search ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          ) : (
            <nav className="flex gap-6 font-body-md text-body-md">
              <span className="border-b-2 border-primary pb-1 font-bold text-primary">Overview</span>
              <span className="cursor-not-allowed text-on-surface-variant opacity-50">Reports</span>
            </nav>
          )}

          <div className="flex items-center gap-4">
            {!showTopSearch && (
              <nav className="mr-4 flex gap-6 font-body-md text-body-md">
                <span className="border-b-2 border-primary pb-1 font-bold text-primary">Overview</span>
                <span className="cursor-not-allowed text-on-surface-variant opacity-50">Reports</span>
              </nav>
            )}
            <button className="text-on-surface-variant transition-colors hover:text-primary" type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant transition-colors hover:text-primary" type="button">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="ml-2 flex items-center gap-3 border-l border-outline-variant pl-4">
              <Image
                alt=""
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
                height={32}
                src={ADMIN_AVATAR}
                unoptimized
                width={32}
              />
              {adminName && (
                <span className="hidden font-body-md text-body-md text-on-surface lg:inline">{adminName}</span>
              )}
            </div>
          </div>
        </header>

        <main className="mt-0 flex-1 overflow-y-auto p-margin-mobile md:mt-16 md:p-margin-desktop">
          <div className="mx-auto max-w-container-max">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="mb-2 font-headline-md text-headline-md text-primary">{title}</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminTableCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest card-shadow">
      {children}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-bright p-4">
      <span className="font-body-md text-body-md text-on-surface-variant">
        Showing {start} to {end} of {totalItems} entries
      </span>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
          disabled={page <= 1}
          type="button"
          onClick={() => onPageChange(page - 1)}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={
              n === page
                ? "flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container font-title-lg text-[14px] text-on-primary-container"
                : "flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant font-title-lg text-[14px] text-on-surface-variant transition-colors hover:bg-surface-container-low"
            }
            type="button"
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        ))}
        <button
          className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
          disabled={page >= totalPages}
          type="button"
          onClick={() => onPageChange(page + 1)}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
