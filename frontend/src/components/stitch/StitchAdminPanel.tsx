"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/components/auth/AdminProvider";
import { apiFetch } from "@/lib/api/client";
import { getAdminToken } from "@/lib/auth/session";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";
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

type AdminSection = "dashboard" | "verification" | "users" | "listings";

type UserRow = {
  id: string;
  email: string;
  name: string;
  verification_status?: string;
  email_verified?: boolean;
  is_active?: boolean;
  intends_seller?: boolean;
};

type ListingRow = {
  id: string;
  title: string;
  city: string;
  listingType: string;
  price: number;
  currency: string;
  status: string;
  sellerId: string;
};

const PAGE_SIZE = 10;

function formatSubmitted(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function DocThumb({ href, wide }: { href: string; wide?: boolean }) {
  return (
    <a
      className={`${wide ? "w-32 h-20" : "w-20 h-20"} bg-surface-container rounded-lg border border-outline-variant overflow-hidden cursor-zoom-in group relative block`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className={`w-full h-full object-cover ${wide ? "grayscale group-hover:grayscale-0" : ""} transition-all`}
        src={href}
      />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-white">zoom_in</span>
      </div>
    </a>
  );
}

function NavItem({
  icon,
  label,
  active,
  href,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = active
    ? "flex items-center px-6 py-3 sidebar-active"
    : "flex items-center px-6 py-3 text-on-surface-variant hover:bg-surface-container-low transition-colors group";

  const inner = (
    <>
      <span
        className="material-symbols-outlined mr-3 text-[20px]"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span className="font-body-md text-body-md">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <li>
        <button className={`${className} w-full text-left`} type="button" onClick={onClick}>
          {inner}
        </button>
      </li>
    );
  }

  if (disabled || !href) {
    return (
      <li>
        <span className={`${className} opacity-50 cursor-not-allowed`} title="Coming soon">
          {inner}
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link className={className} href={href}>
        {inner}
      </Link>
    </li>
  );
}

export function StitchAdminPanel() {
  const router = useRouter();
  const { logout: adminLogout } = useAdminAuth();
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [listingRows, setListingRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueWarning, setQueueWarning] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectUserId, setRejectUserId] = useState("");
  const [rejectName, setRejectName] = useState("");

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
        apiFetch<{ verifications: VerificationRow[]; warning?: string }>("/api/admin/verifications", {
          token: t,
        }),
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
    load();
  }, [load]);

  const filteredVerifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.userName.toLowerCase().includes(q) || r.userEmail.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return userRows;
    return userRows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
    );
  }, [userRows, search]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listingRows;
    return listingRows.filter(
      (r) => r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q),
    );
  }, [listingRows, search]);

  const dashboardStats = useMemo(() => {
    const pending = userRows.filter((u) => u.verification_status === "pending").length;
    return {
      pending,
      users: userRows.length,
      listings: listingRows.length,
      verifiedSellers: userRows.filter((u) => u.verification_status === "verified").length,
    };
  }, [userRows, listingRows]);

  const activeList =
    section === "dashboard"
      ? []
      : section === "users"
        ? filteredUsers
        : section === "listings"
          ? filteredListings
          : filteredVerifications;

  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const pageVerifications = filteredVerifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageListings = filteredListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, section]);

  async function approve(row: VerificationRow) {
    const t = getAdminToken();
    if (!t) return;
    await apiFetch(`/api/admin/verifications/${row.id}/approve`, {
      method: "POST",
      token: t,
      body: JSON.stringify({ userId: row.userId }),
    });
    await load();
  }

  async function confirmReject() {
    if (!rejectId) return;
    const t = getAdminToken();
    if (!t) return;
    await apiFetch(`/api/admin/verifications/${rejectId}/reject`, {
      method: "POST",
      token: t,
      body: JSON.stringify({ userId: rejectUserId, rejectionReason: rejectReason }),
    });
    setRejectId(null);
    setRejectReason("");
    await load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant">
        Loading admin…
      </div>
    );
  }

  const initials = admin?.name
    ?.split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    admin?.role === "super_admin" ? "Super Admin" : admin?.role?.replace(/_/g, " ") ?? "Admin";

  return (
    <div className="text-on-surface flex min-h-screen bg-background">
      <aside className="w-64 bg-surface border-r border-outline-variant flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-outline-variant">
          <Image alt="RoofStead Admin" className="h-10 w-auto object-contain" height={40} src={STITCH_LOGO_SRC} width={120} />
          <p className="mt-2 text-on-surface-variant font-label-md text-label-md tracking-widest">INTERNAL ADMIN</p>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <NavItem
              active={section === "dashboard"}
              icon="dashboard"
              label="Dashboard"
              onClick={() => setSection("dashboard")}
            />
            <NavItem
              active={section === "users"}
              icon="group"
              label="Users"
              onClick={() => setSection("users")}
            />
            <NavItem
              active={section === "verification"}
              icon="verified_user"
              label="Verification Queue"
              onClick={() => setSection("verification")}
            />
            <NavItem
              active={section === "listings"}
              icon="list_alt"
              label="All Listings"
              onClick={() => setSection("listings")}
            />
          </ul>
        </nav>
        <div className="p-6 border-t border-outline-variant">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs">
              {initials}
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface">{admin?.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{roleLabel}</p>
            </div>
          </div>
          <button
            className="w-full flex items-center justify-center py-2 px-4 border border-outline-variant rounded hover:bg-surface-container-low transition-colors text-body-md font-body-md"
            type="button"
            onClick={() => {
              void adminLogout().then(() => router.push("/admin/login"));
            }}
          >
            <span className="material-symbols-outlined text-sm mr-2">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-margin-desktop">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 mb-8 border-b border-outline-variant pb-6">
          <div>
            <h1 className="font-headline-md text-headline-md text-primary">
              {section === "dashboard"
                ? "Dashboard"
                : section === "users"
                  ? "Users"
                  : section === "listings"
                    ? "All Listings"
                    : "Verification Queue"}
            </h1>
            <p className="text-on-surface-variant font-body-md text-body-md mt-1">
              {section === "dashboard"
                ? "Overview of users, seller verifications, and listings from Airtable."
                : section === "users"
                  ? "Accounts stored in Airtable Users — verification status and seller intent."
                  : section === "listings"
                    ? "All listing records in Airtable, any status."
                    : "Users with Verification Status = pending in Airtable (documents from SellerVerifications when available)."}
            </p>
          </div>
          {section !== "dashboard" && (
          <div className="flex space-x-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary w-full sm:w-64 transition-all outline-none"
                placeholder={
                  section === "users"
                    ? "Search users..."
                    : section === "listings"
                      ? "Search listings..."
                      : "Search sellers..."
                }
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="flex items-center px-4 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface-variant hover:bg-surface-container-low transition-all opacity-60 cursor-not-allowed"
              disabled
              type="button"
            >
              <span className="material-symbols-outlined mr-2 text-lg">filter_list</span>
              <span className="font-label-md text-label-md">Filter</span>
            </button>
          </div>
          )}
        </header>

        {section === "dashboard" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter mb-8">
              <button
                className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm text-left hover:border-primary transition-colors"
                type="button"
                onClick={() => setSection("verification")}
              >
                <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
                  Pending verifications
                </p>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.pending}</p>
                <p className="text-sm text-on-surface-variant mt-2">Users awaiting review →</p>
              </button>
              <button
                className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm text-left hover:border-primary transition-colors"
                type="button"
                onClick={() => setSection("users")}
              >
                <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
                  Total users
                </p>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.users}</p>
                <p className="text-sm text-on-surface-variant mt-2">Manage accounts →</p>
              </button>
              <button
                className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm text-left hover:border-primary transition-colors"
                type="button"
                onClick={() => setSection("listings")}
              >
                <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
                  Listings
                </p>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.listings}</p>
                <p className="text-sm text-on-surface-variant mt-2">View all listings →</p>
              </button>
              <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
                <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
                  Verified sellers
                </p>
                <p className="font-display-lg text-display-lg text-primary">{dashboardStats.verifiedSellers}</p>
                <p className="text-sm text-on-surface-variant mt-2">Can publish listings</p>
              </div>
            </div>
            {dashboardStats.pending > 0 && (
              <div className="mb-8 p-4 rounded-xl border border-primary/30 bg-primary-container/10">
                <p className="font-body-md text-body-md">
                  You have <strong>{dashboardStats.pending}</strong> pending seller verification
                  {dashboardStats.pending === 1 ? "" : "s"}. Open the verification queue to approve or reject.
                </p>
                <button
                  className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md"
                  type="button"
                  onClick={() => setSection("verification")}
                >
                  Open verification queue
                </button>
              </div>
            )}
          </>
        )}

        {section === "verification" && queueWarning && (
          <div className="mb-6 p-4 rounded-xl border border-secondary-container bg-secondary-container/20 text-on-surface font-body-md">
            {queueWarning}
          </div>
        )}

        {section === "verification" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
            <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
              Pending tasks
            </p>
            <p className="font-display-lg text-display-lg text-primary">{rows.length}</p>
            <div className="flex items-center mt-2 text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-xs mr-1">inbox</span>
              <span>Awaiting review</span>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
            <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
              Avg. response time
            </p>
            <p className="font-display-lg text-display-lg text-primary">—</p>
            <div className="flex items-center mt-2 text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-xs mr-1">timer</span>
              <span>Target: &lt; 6h</span>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
            <p className="text-on-surface-variant font-label-md text-label-md mb-1 uppercase tracking-wider">
              Approved today
            </p>
            <p className="font-display-lg text-display-lg text-primary">—</p>
            <div className="flex items-center mt-2 text-primary-container text-sm">
              <span className="material-symbols-outlined text-xs mr-1">check_circle</span>
              <span>Metrics coming soon</span>
            </div>
          </div>
        </div>
        )}

        {section !== "dashboard" && (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {section === "users" ? (
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Seller</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Verification</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pageUsers.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-on-surface-variant" colSpan={5}>
                      No users in Airtable.
                    </td>
                  </tr>
                )}
                {pageUsers.map((u) => (
                  <tr key={u.id} className="data-table-row transition-colors">
                    <td className="px-6 py-4 font-title-lg text-title-lg">{u.name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{u.email}</td>
                    <td className="px-6 py-4">{u.intends_seller ? "Yes" : "—"}</td>
                    <td className="px-6 py-4">{u.verification_status ?? "—"}</td>
                    <td className="px-6 py-4">{u.is_active === false ? "No" : "Yes"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            ) : section === "listings" ? (
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">City</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pageListings.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-on-surface-variant" colSpan={5}>
                      No listings in Airtable.
                    </td>
                  </tr>
                )}
                {pageListings.map((l) => (
                  <tr key={l.id} className="data-table-row transition-colors">
                    <td className="px-6 py-4 font-title-lg text-title-lg">{l.title}</td>
                    <td className="px-6 py-4">{l.city}</td>
                    <td className="px-6 py-4 capitalize">{l.listingType}</td>
                    <td className="px-6 py-4">
                      {l.currency} {l.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 capitalize">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider w-1/4">
                    Seller information
                  </th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    ID document
                  </th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Live selfie
                  </th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pageVerifications.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-on-surface-variant" colSpan={5}>
                      No pending verifications.
                    </td>
                  </tr>
                )}
                {pageVerifications.map((row) => {
                  const submitted = formatSubmitted(row.submittedAt);
                  const avatar = userAvatarSrc(row.userAvatarUrl, "small");
                  return (
                    <tr key={row.id} className="data-table-row transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high mr-4 overflow-hidden shrink-0">
                            <Image
                              alt=""
                              className="w-full h-full object-cover"
                              height={40}
                              src={avatar}
                              unoptimized
                              width={40}
                            />
                          </div>
                          <div>
                            <Link className="font-title-lg text-title-lg text-on-surface hover:text-primary" href={`/admin/verifications/${row.id}`}>
                              {row.userName}
                            </Link>
                            <p className="text-on-surface-variant font-body-md text-body-md">{row.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {row.idDocumentUrl ? <DocThumb href={row.idDocumentUrl} wide /> : "—"}
                      </td>
                      <td className="px-6 py-6">
                        {row.selfieUrl ? <DocThumb href={row.selfieUrl} /> : "—"}
                      </td>
                      <td className="px-6 py-6">
                        <p className="font-body-md text-body-md text-on-surface">{submitted.date}</p>
                        {submitted.time && (
                          <p className="text-on-surface-variant font-label-md text-label-md">{submitted.time}</p>
                        )}
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Link
                          className="inline-flex px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded hover:opacity-90 transition-all"
                          href={`/admin/verifications/${row.id}`}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>

          {activeList.length > 0 && (
            <div className="bg-surface px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant">
              <p className="text-on-surface-variant font-body-md text-body-md">
                Showing{" "}
                <span className="font-bold text-on-surface">{(page - 1) * PAGE_SIZE + 1}</span> to{" "}
                <span className="font-bold text-on-surface">{Math.min(page * PAGE_SIZE, activeList.length)}</span> of{" "}
                <span className="font-bold text-on-surface">{activeList.length}</span> entries
              </p>
              <div className="flex space-x-2">
                <button
                  className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-container-low disabled:opacity-50 transition-all"
                  disabled={page <= 1}
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={
                      n === page
                        ? "px-3 py-1 bg-primary text-on-primary rounded font-label-md text-label-md"
                        : "px-3 py-1 border border-outline-variant rounded hover:bg-surface-container-low font-label-md text-label-md"
                    }
                    type="button"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-container-low disabled:opacity-50 transition-all"
                  disabled={page >= totalPages}
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        <footer className="mt-12 text-center text-on-surface-variant font-body-md text-body-md opacity-60">
          © {new Date().getFullYear()} RoofStead Internal Systems. Internal use only.
        </footer>
      </main>

      {rejectId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface p-8 rounded-xl max-w-md w-full shadow-2xl">
            <h3 className="font-headline-sm text-headline-sm text-error mb-4">Reject application</h3>
            <p className="text-on-surface-variant font-body-md text-body-md mb-4">
              Please provide a reason for rejecting {rejectName}&apos;s application. This will be sent to the user.
            </p>
            <textarea
              className="w-full h-32 border border-outline-variant rounded-lg p-3 font-body-md text-body-md focus:ring-2 focus:ring-error focus:border-error mb-6 outline-none"
              placeholder="Document image quality too low..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end space-x-4">
              <button
                className="px-6 py-2 text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low rounded transition-all"
                type="button"
                onClick={() => setRejectId(null)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-error text-on-error font-label-md text-label-md rounded hover:brightness-110 shadow-sm transition-all"
                type="button"
                onClick={confirmReject}
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
