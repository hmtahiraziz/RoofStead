"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminPageHeader,
  AdminPagination,
  AdminShell,
  AdminTableCard,
  type AdminSection,
} from "@/components/admin/AdminShell";
import { apiFetch } from "@/lib/api/client";
import { getAdminToken } from "@/lib/auth/session";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

type VerificationRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
  selfieUrl?: string;
  idDocumentUrl?: string;
  submittedAt?: string;
};

type AdminMe = { id: string; email: string; name: string; role?: string };

type UserRow = {
  id: string;
  email: string;
  name: string;
  role?: string;
  profile_picture_url?: string;
  verification_status?: string;
  is_active?: boolean;
  intends_seller?: boolean;
};

type ListingRow = {
  id: string;
  title: string;
  city: string;
  address?: string;
  listingType: string;
  price: number;
  currency: string;
  sellerId: string;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl?: string;
};

const PAGE_SIZE = 10;

const LISTING_PLACEHOLDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAWGVRWPTmP406LprVAQpFfAPTBz2YXexOSGrwjZoO-Z1iSrjkaPioEeC4EWWhMthKWCWL-Lo-nr-AQRTQj_3vAuNScH9n_7DFUpro0WDJHbYPgv1j8wAbpa_QrJOHZsCBnWQKVb67Pn7dgD6PRRpU0huTva2daMUbblCQj5ItlksLXQf0BLoIlwU2KhTvGz5U4cDTQ4aZMJCF0pyKQ04M6kX6IPobpMCEVV5wkIVrfWMxf4yus2GY0NkyCTE-d4stPbzFYBwjnYpm0";

function formatSubmitted(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function userInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function userRoleLabel(user: UserRow): string {
  if (user.role === "seller" || user.intends_seller) return "Seller";
  return "Buyer";
}

function userStatusBadge(user: UserRow) {
  if (user.is_active === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-error-container px-2.5 py-1 font-label-md text-label-md text-on-error-container">
        <span className="h-1.5 w-1.5 rounded-full bg-error" />
        Suspended
      </span>
    );
  }
  if (user.verification_status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary-container px-2.5 py-1 font-label-md text-label-md text-on-secondary-container">
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-fixed px-2.5 py-1 font-label-md text-label-md text-on-primary-fixed">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Active
    </span>
  );
}

function DocThumb({ href, wide }: { href: string; wide?: boolean }) {
  return (
    <a
      className={`${wide ? "h-20 w-32" : "h-16 w-16"} group relative block overflow-hidden rounded-lg border border-outline-variant bg-surface-container`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="h-full w-full object-cover transition-all group-hover:grayscale-0" src={href} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="material-symbols-outlined text-white">zoom_in</span>
      </div>
    </a>
  );
}

export function StitchAdminPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [listingRows, setListingRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueWarning, setQueueWarning] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setQueueWarning(null);
    try {
      const me = await apiFetch<AdminMe>("/api/admin/me", { token: t });
      setAdmin(me);
    } catch {
      router.replace("/admin/login");
      return;
    } finally {
      setLoading(false);
    }

    try {
      const [queue, usersRes, listingsRes] = await Promise.all([
        apiFetch<{ verifications: VerificationRow[]; warning?: string }>("/api/admin/verifications", { token: t }),
        apiFetch<{ users: UserRow[] }>("/api/admin/users", { token: t }),
        apiFetch<{ listings: ListingRow[] }>("/api/admin/listings", { token: t }),
      ]);
      setRows(queue.verifications);
      setQueueWarning(queue.warning ?? null);
      setUserRows(usersRes.users);
      setListingRows(listingsRes.listings);
    } catch (err) {
      setRows([]);
      setUserRows([]);
      setListingRows([]);
      setQueueWarning(err instanceof Error ? err.message : "Could not load admin data from Airtable.");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const param = searchParams.get("section");
    if (param === "users" || param === "verification" || param === "listings" || param === "dashboard") {
      setSection(param);
    }
  }, [searchParams]);

  function navigateSection(next: AdminSection) {
    setSection(next);
    router.replace(next === "dashboard" ? "/admin" : `/admin?section=${next}`, { scroll: false });
  }

  const dashboardStats = useMemo(() => {
    const activeListings = listingRows.length;
    return {
      activeListings,
      pendingVerifications: rows.length,
      totalUsers: userRows.length,
      verifiedSellers: userRows.filter((u) => u.verification_status === "verified").length,
    };
  }, [userRows, listingRows, rows]);

  const filteredVerifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.userName.toLowerCase().includes(q) || r.userEmail.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return userRows.filter((u) => {
      const matchesSearch =
        !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const role = userRoleLabel(u).toLowerCase();
      const matchesRole = !roleFilter || role === roleFilter;
      let accountStatus = "active";
      if (u.is_active === false) accountStatus = "suspended";
      else if (u.verification_status === "pending") accountStatus = "pending";
      const matchesStatus = !statusFilter || accountStatus === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [userRows, search, roleFilter, statusFilter]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listingRows;
    return listingRows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        (r.address?.toLowerCase().includes(q) ?? false),
    );
  }, [listingRows, search]);

  const activeList =
    section === "users"
      ? filteredUsers
      : section === "listings"
        ? filteredListings
        : section === "verification"
          ? filteredVerifications
          : [];

  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const pageVerifications = filteredVerifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageListings = filteredListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, section, roleFilter, statusFilter]);

  const searchPlaceholder =
    section === "users"
      ? "Search users by name or email..."
      : section === "listings"
        ? "Search listings..."
        : "Search sellers...";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        Loading admin…
      </div>
    );
  }

  return (
    <AdminShell
      adminName={admin?.name}
      adminRole={admin?.role}
      search={search}
      searchPlaceholder={searchPlaceholder}
      section={section}
      showTopSearch={section !== "dashboard"}
      onSearchChange={setSearch}
      onSectionChange={navigateSection}
    >
      {section === "dashboard" && (
        <>
          <AdminPageHeader
            description="Welcome back. Here is the current status of the platform."
            title="Dashboard Overview"
          />

          <div className="mb-12 grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
            <button
              className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left card-shadow transition-colors hover:border-primary-container/30"
              type="button"
              onClick={() => navigateSection("listings")}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  Total Listings
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/10 text-primary-container">
                  <span className="material-symbols-outlined text-sm">real_estate_agent</span>
                </div>
              </div>
              <div>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.activeListings}</p>
                <p className="mt-2 flex items-center gap-1 font-label-md text-label-md text-primary">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {listingRows.length} total in Airtable
                </p>
              </div>
            </button>

            <button
              className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left card-shadow transition-colors hover:border-primary-container/30"
              type="button"
              onClick={() => navigateSection("verification")}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  Pending Verifications
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container/20 text-secondary">
                  <span className="material-symbols-outlined text-sm">pending_actions</span>
                </div>
              </div>
              <div>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.pendingVerifications}</p>
                <p className="mt-2 flex items-center gap-1 font-label-md text-label-md text-secondary">
                  <span className="material-symbols-outlined text-sm">error</span>
                  Requires attention
                </p>
              </div>
            </button>

            <button
              className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left card-shadow transition-colors hover:border-primary-container/30"
              type="button"
              onClick={() => navigateSection("users")}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  Total Users
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/10 text-primary-container">
                  <span className="material-symbols-outlined text-sm">groups</span>
                </div>
              </div>
              <div>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.totalUsers}</p>
                <p className="mt-2 flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">group</span>
                  Buyer & seller accounts
                </p>
              </div>
            </button>

            <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
              <div className="mb-4 flex items-start justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  Verified Sellers
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/10 text-primary-container">
                  <span className="material-symbols-outlined text-sm">verified</span>
                </div>
              </div>
              <div>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.verifiedSellers}</p>
                <p className="mt-2 flex items-center gap-1 font-label-md text-label-md text-primary">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Can publish listings
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-title-lg text-title-lg text-primary">Monthly Growth</h3>
                <select className="rounded-md border border-outline-variant bg-surface px-3 py-1 font-label-md text-label-md text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container/50">
                  <option>Last 6 Months</option>
                </select>
              </div>
              <div className="relative flex h-64 items-end justify-center overflow-hidden rounded-lg bg-surface-container p-4">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e3e1_1px,transparent_1px),linear-gradient(to_bottom,#e2e3e1_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-50" />
                <div className="z-10 flex h-full w-full items-end justify-between px-8 pt-8">
                  {[30, 45, 60, 55, 80, 95].map((h, i) => (
                    <div
                      key={i}
                      className="group relative w-12 rounded-t-sm bg-primary-container transition-colors hover:bg-primary"
                      style={{ height: `${h}%`, opacity: 0.35 + i * 0.12 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-gutter">
              <div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
                <h3 className="mb-4 flex items-center gap-2 font-title-lg text-title-lg text-primary">
                  <span className="material-symbols-outlined text-secondary">assignment_late</span>
                  Priority Tasks
                </h3>
                <ul className="space-y-3">
                  {dashboardStats.pendingVerifications > 0 && (
                    <li>
                      <button
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-outline-variant bg-surface p-3 transition-colors hover:border-primary-container/30"
                        type="button"
                        onClick={() => navigateSection("verification")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-secondary" />
                          <span className="font-body-md text-body-md text-on-surface">
                            {dashboardStats.pendingVerifications} Identity Verifications
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">chevron_right</span>
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-outline-variant bg-surface p-3 transition-colors hover:border-primary-container/30"
                      type="button"
                      onClick={() => navigateSection("users")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary-container" />
                        <span className="font-body-md text-body-md text-on-surface">Review user accounts</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">chevron_right</span>
                    </button>
                  </li>
                  <li>
                    <button
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-outline-variant bg-surface p-3 transition-colors hover:border-primary-container/30"
                      type="button"
                      onClick={() => navigateSection("listings")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-error" />
                        <span className="font-body-md text-body-md text-on-surface">Browse listings</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">chevron_right</span>
                    </button>
                  </li>
                </ul>
              </div>

              <div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
                <h3 className="mb-4 font-title-lg text-title-lg text-primary">Recent Activity</h3>
                <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-outline-variant">
                  {rows.slice(0, 2).map((row) => (
                    <div key={row.id} className="relative pl-8">
                      <div className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant bg-surface">
                        <span className="material-symbols-outlined text-[12px] text-primary-container">verified</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface">
                        Verification pending for <span className="font-medium">{row.userName}</span>
                      </p>
                      <p className="mt-1 font-label-md text-label-md text-on-surface-variant">
                        {formatSubmitted(row.submittedAt).date}
                      </p>
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <p className="font-body-md text-body-md text-on-surface-variant">No pending verifications.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {section === "users" && (
        <>
          <AdminPageHeader
            action={
              <button
                className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-6 py-3 font-title-lg text-sm text-primary opacity-60"
                disabled
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Data
              </button>
            }
            description="Manage accounts, roles, and verification status across the platform."
            title="User Management"
          />

          <AdminTableCard>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant bg-surface-bright p-6">
              <div className="relative w-full max-w-xs">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
                  search
                </span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 font-body-md text-body-md transition-all focus:border-primary focus:outline-none focus:shadow-[0_0_0_2px_rgba(27,67,50,0.1)]"
                  placeholder="Search users by name or email..."
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <select
                  className="cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface-variant focus:border-primary focus:outline-none"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
                <select
                  className="cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface-variant focus:border-primary focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Verification</th>
                    <th className="px-6 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface">
                  {pageUsers.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-on-surface-variant" colSpan={5}>
                        No users found.
                      </td>
                    </tr>
                  )}
                  {pageUsers.map((u) => {
                    const avatar = userAvatarSrc(u.profile_picture_url, "small");
                    return (
                      <tr
                        key={u.id}
                        className="cursor-pointer transition-colors hover:bg-surface-container-low"
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {u.profile_picture_url ? (
                              <Image
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                                height={40}
                                src={avatar}
                                unoptimized
                                width={40}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest font-title-lg text-[16px] text-on-surface-variant">
                                {userInitials(u.name)}
                              </div>
                            )}
                            <div>
                              <div className="mb-0.5 font-title-lg text-[14px] leading-tight text-on-surface">
                                {u.name}
                              </div>
                              <div className="text-[13px] text-on-surface-variant">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-surface-container-high px-2.5 py-1 font-label-md text-label-md text-on-surface-variant">
                            {userRoleLabel(u)}
                          </span>
                        </td>
                        <td className="px-6 py-4">{userStatusBadge(u)}</td>
                        <td className="px-6 py-4 capitalize text-on-surface-variant">
                          {u.verification_status ?? "unverified"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            className="inline-flex rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                            href={`/admin/users/${u.id}`}
                            title="View user details"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined">visibility</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              totalItems={filteredUsers.length}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </AdminTableCard>
        </>
      )}

      {section === "verification" && (
        <>
          <AdminPageHeader
            description="Review seller identity submissions and approve or reject verification requests."
            title="Verification Queue"
          />

          {queueWarning && (
            <div className="mb-6 rounded-xl border border-secondary-container bg-secondary-container/20 p-4 font-body-md text-on-surface">
              {queueWarning}
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-gutter md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
              <p className="mb-1 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                Pending tasks
              </p>
              <p className="font-display-lg text-display-lg text-primary">{rows.length}</p>
              <p className="mt-2 flex items-center text-sm text-on-surface-variant">
                <span className="material-symbols-outlined mr-1 text-xs">inbox</span>
                Awaiting review
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
              <p className="mb-1 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                Verified sellers
              </p>
              <p className="font-display-lg text-display-lg text-primary">{dashboardStats.verifiedSellers}</p>
              <p className="mt-2 flex items-center text-sm text-on-surface-variant">
                <span className="material-symbols-outlined mr-1 text-xs">verified</span>
                Platform total
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
              <p className="mb-1 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                Seller accounts
              </p>
              <p className="font-display-lg text-display-lg text-primary">
                {userRows.filter((u) => u.intends_seller || u.role === "seller").length}
              </p>
              <p className="mt-2 flex items-center text-sm text-primary-container">
                <span className="material-symbols-outlined mr-1 text-xs">group</span>
                Registered as sellers
              </p>
            </div>
          </div>

          <AdminTableCard>
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    <th className="p-4 font-medium">Seller</th>
                    <th className="p-4 font-medium">ID Document</th>
                    <th className="p-4 font-medium">Selfie</th>
                    <th className="p-4 font-medium">Submitted</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface">
                  {pageVerifications.length === 0 && (
                    <tr>
                      <td className="p-8 text-on-surface-variant" colSpan={6}>
                        No pending verifications.
                      </td>
                    </tr>
                  )}
                  {pageVerifications.map((row) => {
                    const submitted = formatSubmitted(row.submittedAt);
                    const avatar = userAvatarSrc(row.userAvatarUrl, "small");
                    return (
                      <tr key={row.id} className="group transition-colors hover:bg-surface-container-lowest">
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <Image
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full object-cover"
                              height={40}
                              src={avatar}
                              unoptimized
                              width={40}
                            />
                            <div>
                              <Link
                                className="font-title-lg text-title-lg text-on-surface hover:text-primary"
                                href={`/admin/users/${row.userId}`}
                              >
                                {row.userName}
                              </Link>
                              <p className="font-body-md text-body-md text-on-surface-variant">{row.userEmail}</p>
                              <p className="font-label-md text-label-md text-on-surface-variant">ID: #{row.userId.slice(-4)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {row.idDocumentUrl ? <DocThumb href={row.idDocumentUrl} wide /> : "—"}
                        </td>
                        <td className="p-4">{row.selfieUrl ? <DocThumb href={row.selfieUrl} /> : "—"}</td>
                        <td className="p-4">
                          <p className="font-body-md text-body-md text-on-surface">{submitted.date}</p>
                          {submitted.time && (
                            <p className="font-label-md text-label-md text-on-surface-variant">{submitted.time}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 font-label-md text-label-md text-on-secondary-container">
                            <span className="material-symbols-outlined text-[14px]">pending</span>
                            Pending
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              className="rounded-full border border-outline-variant bg-surface p-2 text-on-surface-variant shadow-sm transition-all hover:bg-surface-container hover:text-primary"
                              href={`/admin/verifications/${row.id}`}
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </Link>
                            <Link
                              className="rounded-full p-2 text-primary transition-all hover:bg-primary-container"
                              href={`/admin/verifications/${row.id}`}
                              title="Review"
                            >
                              <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              totalItems={filteredVerifications.length}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </AdminTableCard>
        </>
      )}

      {section === "listings" && (
        <>
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display-lg-mobile text-display-lg-mobile tracking-tight text-on-surface md:font-display-lg md:text-display-lg">
                Listing Moderation
              </h2>
              <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">
                View and manage published property listings.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-label-md text-label-md text-on-surface opacity-60"
                disabled
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Filter
              </button>
            </div>
          </div>

          <AdminTableCard>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    <th className="p-4 font-medium">Property</th>
                    <th className="p-4 font-medium">Seller</th>
                    <th className="p-4 font-medium">Price / Loc</th>
                    <th className="p-4 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface">
                  {pageListings.length === 0 && (
                    <tr>
                      <td className="p-8 text-on-surface-variant" colSpan={4}>
                        No listings in Airtable.
                      </td>
                    </tr>
                  )}
                  {pageListings.map((l) => (
                    <tr
                      key={l.id}
                      className="group cursor-pointer transition-colors hover:bg-surface-container-lowest"
                      onClick={() => router.push(`/admin/listings/${l.id}`)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-variant">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt=""
                              className="h-full w-full object-cover"
                              src={l.imageUrl || LISTING_PLACEHOLDER}
                            />
                          </div>
                          <div>
                            <h3 className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors">
                              {l.title}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
                              {l.bedrooms != null && (
                                <>
                                  <span className="material-symbols-outlined text-[16px]">bed</span>
                                  {l.bedrooms}
                                </>
                              )}
                              {l.bathrooms != null && (
                                <>
                                  <span className="material-symbols-outlined ml-2 text-[16px]">shower</span>
                                  {l.bathrooms}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-body-md text-body-md text-on-surface">Seller</div>
                        <div className="mt-1 font-label-md text-label-md text-on-surface-variant">
                          ID: #{l.sellerId.slice(-4)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-title-lg text-title-lg text-primary">
                          {l.currency} {l.price.toLocaleString()}
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {l.city}
                        </div>
                      </td>
                      <td className="p-4 capitalize font-body-md text-body-md text-on-surface-variant">
                        {l.listingType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              totalItems={filteredListings.length}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </AdminTableCard>
        </>
      )}
    </AdminShell>
  );
}
