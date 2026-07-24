"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/auth/AdminProvider";
import { apiFetch } from "@/lib/api/client";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";
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
      <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant">
        Loading verification…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <Link className="text-primary font-label-md hover:underline" href="/admin">
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const avatar = userAvatarSrc(data.user.avatarUrl, "small");

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="bg-surface border-b border-outline-variant px-margin-desktop py-4">
        <div className="max-w-container-max mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image alt="RoofStead Admin" className="h-10 w-auto" height={40} src={STITCH_LOGO_SRC} width={120} />
            <h1 className="font-headline-sm text-headline-sm text-primary">Verification review</h1>
          </div>
          <Link className="font-label-md text-primary hover:underline" href="/admin">
            Back to queue
          </Link>
        </div>
      </header>

      <main className="max-w-container-max mx-auto px-margin-desktop py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface rounded-xl border border-outline-variant p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
              <Image alt="" className="rounded-full w-14 h-14 object-cover" height={56} src={avatar} unoptimized width={56} />
              <div>
                <h2 className="font-title-lg text-title-lg">{data.user.name}</h2>
                <p className="text-on-surface-variant">{data.user.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><dt className="text-on-surface-variant">Legal name</dt><dd>{data.user.legalName || "—"}</dd></div>
              <div><dt className="text-on-surface-variant">ID number</dt><dd>{data.user.idNumber || "—"}</dd></div>
              <div><dt className="text-on-surface-variant">Phone</dt><dd>{data.user.phone || "—"}</dd></div>
              <div><dt className="text-on-surface-variant">Submitted</dt><dd>{data.verification.submittedAt ? new Date(data.verification.submittedAt).toLocaleString() : "—"}</dd></div>
            </dl>
            {data.verification.notes && (
              <p className="mt-4 text-sm"><span className="text-on-surface-variant">Notes:</span> {data.verification.notes}</p>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.verification.idDocumentUrl && (
              <div className="bg-surface rounded-xl border border-outline-variant p-4">
                <p className="font-label-md mb-3">ID document</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="ID document" className="w-full rounded-lg border border-outline-variant" src={data.verification.idDocumentUrl} />
              </div>
            )}
            {data.verification.selfieUrl && (
              <div className="bg-surface rounded-xl border border-outline-variant p-4">
                <p className="font-label-md mb-3">Selfie</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Selfie" className="w-full rounded-lg border border-outline-variant" src={data.verification.selfieUrl} />
              </div>
            )}
          </section>
        </div>

        <aside className="bg-surface rounded-xl border border-outline-variant p-6 h-fit sticky top-6 space-y-6">
          <h3 className="font-headline-sm text-headline-sm text-primary">Decision</h3>
          <div className="flex flex-col gap-3">
            <button
              className={`px-4 py-3 rounded-lg border font-label-md text-left ${statusChoice === "approved" ? "border-primary bg-primary-fixed text-primary" : "border-outline-variant"}`}
              type="button"
              onClick={() => setStatusChoice("approved")}
            >
              Verify seller
            </button>
            <button
              className={`px-4 py-3 rounded-lg border font-label-md text-left ${statusChoice === "rejected" ? "border-error bg-error-container/20 text-error" : "border-outline-variant"}`}
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
                className="w-full border border-outline-variant rounded-lg p-3 min-h-[100px]"
                id="reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what needs to be corrected…"
              />
            </div>
          )}

          {error && <p className="text-error text-sm">{error}</p>}

          <button
            className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md disabled:opacity-60"
            disabled={saving}
            type="button"
            onClick={() => void saveDecision()}
          >
            {saving ? "Saving…" : "Update status"}
          </button>
        </aside>
      </main>
    </div>
  );
}
