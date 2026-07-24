"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/components/auth/AdminProvider";
import { apiFetch } from "@/lib/api/client";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

type DetailResponse = {
  verification: {
    id: string;
    status: string;
    selfieUrl?: string;
    idDocumentUrl?: string;
    notes?: string;
    rejectionReason?: string;
    submittedAt?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    verificationStatus?: string;
    legalName?: string;
    idNumber?: string;
    phone?: string;
  };
};

export function StitchAdminVerificationDetail({ verificationId }: { verificationId: string }) {
  const router = useRouter();
  const { token, loading: authLoading } = useAdminAuth();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChoice, setStatusChoice] = useState<"approved" | "rejected">("approved");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<DetailResponse>(`/api/admin/verifications/${verificationId}`, { token });
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load verification");
    } finally {
      setLoading(false);
    }
  }, [token, verificationId]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    void load();
  }, [authLoading, token, router, load]);

  async function saveDecision() {
    if (!token || !data) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/verifications/${verificationId}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          userId: data.user.id,
          status: statusChoice,
          rejectionReason: statusChoice === "rejected" ? rejectionReason : undefined,
        }),
      });
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        Loading verification…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center">
          <p className="mb-4 text-error">{error}</p>
          <Link className="font-label-md text-primary hover:underline" href="/admin">
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const avatar = userAvatarSrc(data.user.avatarUrl, "small");

  return (
    <AdminShell
      section="verification"
      onSectionChange={(s) => {
        router.push(s === "dashboard" ? "/admin" : `/admin?section=${s}`);
      }}
    >
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
          href="/admin"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to verification queue
        </Link>
      </div>

      <AdminPageHeader
        description="Review submitted documents and approve or reject this seller verification."
        title="Verification Review"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 md:p-8 card-shadow">
            <div className="mb-6 flex items-center gap-4">
              <Image
                alt=""
                className="h-14 w-14 rounded-full object-cover"
                height={56}
                src={avatar}
                unoptimized
                width={56}
              />
              <div>
                <h2 className="font-title-lg text-title-lg">{data.user.name}</h2>
                <p className="text-on-surface-variant">{data.user.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-on-surface-variant">Legal name</dt>
                <dd>{data.user.legalName || "—"}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">ID number</dt>
                <dd>{data.user.idNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Phone</dt>
                <dd>{data.user.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Submitted</dt>
                <dd>
                  {data.verification.submittedAt
                    ? new Date(data.verification.submittedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
            {data.verification.notes && (
              <p className="mt-4 text-sm">
                <span className="text-on-surface-variant">Notes:</span> {data.verification.notes}
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {data.verification.idDocumentUrl && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 card-shadow">
                <p className="mb-3 font-label-md">ID document</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="ID document"
                  className="w-full rounded-lg border border-outline-variant"
                  src={data.verification.idDocumentUrl}
                />
              </div>
            )}
            {data.verification.selfieUrl && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 card-shadow">
                <p className="mb-3 font-label-md">Selfie</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Selfie"
                  className="w-full rounded-lg border border-outline-variant"
                  src={data.verification.selfieUrl}
                />
              </div>
            )}
          </section>
        </div>

        <aside className="sticky top-24 h-fit space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 card-shadow">
          <h3 className="font-headline-sm text-headline-sm text-primary">Decision</h3>
          <div className="flex flex-col gap-3">
            <button
              className={`rounded-lg border px-4 py-3 text-left font-label-md ${
                statusChoice === "approved"
                  ? "border-primary bg-primary-fixed text-primary"
                  : "border-outline-variant"
              }`}
              type="button"
              onClick={() => setStatusChoice("approved")}
            >
              Verify seller
            </button>
            <button
              className={`rounded-lg border px-4 py-3 text-left font-label-md ${
                statusChoice === "rejected"
                  ? "border-error bg-error-container/20 text-error"
                  : "border-outline-variant"
              }`}
              type="button"
              onClick={() => setStatusChoice("rejected")}
            >
              Reject verification
            </button>
          </div>

          {statusChoice === "rejected" && (
            <div className="space-y-2">
              <label className="font-label-md text-on-surface-variant" htmlFor="reject-reason">
                Rejection reason
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-outline-variant p-3"
                id="reject-reason"
                placeholder="Explain what needs to be corrected…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            className="w-full rounded-lg bg-primary py-3 font-label-md text-on-primary disabled:opacity-60"
            disabled={saving}
            type="button"
            onClick={() => void saveDecision()}
          >
            {saving ? "Saving…" : "Update status"}
          </button>
        </aside>
      </div>
    </AdminShell>
  );
}
