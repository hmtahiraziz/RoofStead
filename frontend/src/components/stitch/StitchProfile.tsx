"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfilePageShell } from "@/components/profile/ProfilePageShell";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { apiFetch } from "@/lib/api/client";
import { isSellerAccount } from "@/lib/auth/routing";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";
import Image from "next/image";

type StepState = "done" | "active" | "pending";

type VerificationDetails = {
  verificationStatus: string;
  latestSubmission?: {
    rejectionReason?: string;
  } | null;
};

function verificationPresentation(status?: string) {
  const s = status ?? "unverified";
  if (s === "verified") {
    return {
      badge: "VERIFIED",
      badgeClass: "bg-primary-container text-on-primary",
      progressPct: 100,
      steps: ["done", "done", "done"] as StepState[],
      info: "Your seller identity is verified. You can publish listings and display the verified badge.",
    };
  }
  if (s === "pending") {
    return {
      badge: "UNDER REVIEW",
      badgeClass: "bg-secondary-container text-on-secondary-container",
      progressPct: 66,
      steps: ["done", "active", "pending"] as StepState[],
      info: "Our team is reviewing your submitted documents. This usually takes 24–48 business hours.",
    };
  }
  if (s === "rejected") {
    return {
      badge: "REJECTED",
      badgeClass: "bg-error-container text-on-error-container",
      progressPct: 33,
      steps: ["done", "pending", "pending"] as StepState[],
      info: "Your verification was not approved. Review the reason below and submit updated documents.",
    };
  }
  return {
    badge: "NOT STARTED",
    badgeClass: "bg-surface-container-high text-on-surface-variant",
    progressPct: 0,
    steps: ["active", "pending", "pending"] as StepState[],
    info: "Complete seller verification to unlock premium listing features.",
  };
}

function StepCircle({ state, icon }: { state: StepState; icon: string }) {
  if (state === "done") {
    return (
      <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center z-10">
        <span className="material-symbols-outlined text-[20px]">check</span>
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center z-10 ring-4 ring-primary-fixed">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-surface-container-high text-outline flex items-center justify-center z-10">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
  );
}

export function StitchProfile() {
  const { user, token, applyProfile, refreshUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);

  useEffect(() => {
    if (!token || !user || !isSellerAccount(user)) return;
    void refreshUser();
    apiFetch<VerificationDetails>("/api/seller/verification", { token })
      .then(setVerificationDetails)
      .catch(() => setVerificationDetails(null));
  }, [token, user, refreshUser]);

  const effectiveStatus =
    user?.verification_status === "pending" && verificationDetails?.latestSubmission == null
      ? "unverified"
      : user?.verification_status;

  const verification = useMemo(
    () => verificationPresentation(effectiveStatus),
    [effectiveStatus],
  );

  if (!user || !token) return null;

  const showPendingBanner =
    user.verification_status === "pending" && verificationDetails?.latestSubmission != null;

  const showSellerSection = isSellerAccount(user);
  const avatarSrc = userAvatarSrc(user.profile_picture_url, "large");
  const rejectionReason = verificationDetails?.latestSubmission?.rejectionReason;

  return (
    <ProfilePageShell>
      {showPendingBanner && showSellerSection && (
        <div className="mb-8 p-4 rounded-xl border border-secondary-container bg-secondary-container/30 flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary shrink-0">hourglass_top</span>
          <p className="font-body-md text-on-surface">
            Your seller verification is under review. We will notify you once an admin completes the review.
          </p>
        </div>
      )}

      <EditProfileModal
        key={editOpen ? user.id + user.name + (user.profile_picture_url ?? "") : "closed"}
        open={editOpen}
        token={token}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={async (profile) => {
          applyProfile(profile);
          await refreshUser();
        }}
      />

      <section className="flex flex-col md:flex-row items-center gap-6 mb-12">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-lg">
            <Image alt="" className="w-full h-full object-cover" height={128} src={avatarSrc} unoptimized={avatarSrc.startsWith("data:") || avatarSrc.includes("localhost")} width={128} />
          </div>
          <button className="absolute bottom-1 right-1 bg-primary text-on-primary p-2 rounded-full shadow-md hover:scale-105 transition-transform" type="button" aria-label="Edit profile photo" onClick={() => setEditOpen(true)}>
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">{user.name}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
            {user.verification_status === "verified" && showSellerSection && (
              <span className="bg-primary-container text-on-primary px-3 py-1 rounded-full font-label-md text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                VERIFIED SELLER
              </span>
            )}
            <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full font-label-md text-[11px]">
              ROOFSTEAD MEMBER
            </span>
          </div>
        </div>
      </section>

      {showSellerSection && (
        <section>
          <div className="bg-surface-container-lowest p-8 rounded-2xl card-shadow border border-outline-variant">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-primary">Seller verification</h2>
                <p className="font-body-md text-on-surface-variant mt-1">Verification status for your seller account.</p>
              </div>
              <span className={`px-4 py-1.5 rounded-lg font-label-md uppercase tracking-wide ${verification.badgeClass}`}>
                {verification.badge}
              </span>
            </div>

            <div className="relative mb-10">
              <div className="absolute top-[18px] left-0 w-full h-[2px] bg-outline-variant" aria-hidden />
              <div className="absolute top-[18px] left-0 h-[2px] bg-primary transition-all duration-1000" style={{ width: `${verification.progressPct}%` }} aria-hidden />
              <div className="relative flex justify-between gap-2">
                {[
                  ["Documents Submitted", "description"],
                  ["Under Review", "visibility"],
                  ["Verified Badge", "shield"],
                ].map(([label, icon], index) => (
                  <div key={label} className="flex flex-col items-center gap-4 flex-1 min-w-0">
                    <StepCircle state={verification.steps[index]} icon={icon} />
                    <span className={`font-label-md text-center ${verification.steps[index] !== "pending" ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex items-start gap-4">
              <span className="material-symbols-outlined text-primary mt-0.5 shrink-0">info</span>
              <p className="font-body-md text-on-surface">{verification.info}</p>
            </div>

            {effectiveStatus === "rejected" && (
              <div className="mt-6 p-4 rounded-xl border border-error/30 bg-error-container/10">
                <p className="font-label-md text-error mb-2">Rejection reason</p>
                <p className="font-body-md text-on-surface">{rejectionReason || "Documentation did not meet requirements."}</p>
                <Link className="inline-flex mt-4 bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md hover:opacity-90" href="/profile/verification">
                  Resubmit verification
                </Link>
              </div>
            )}

            {(effectiveStatus === "unverified" || !effectiveStatus) && (
              <div className="mt-6">
                <Link className="inline-flex bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md hover:opacity-90" href="/profile/verification">
                  Start verification
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </ProfilePageShell>
  );
}
