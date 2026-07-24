"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ProfilePageShell } from "@/components/profile/ProfilePageShell";

function SettingsRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: string;
  title: string;
  subtitle: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-4">
        <div className="p-2 bg-surface-container rounded-lg text-on-surface-variant group-hover:text-primary transition-colors">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface font-semibold">{title}</p>
          <p className="font-body-md text-[12px] text-on-surface-variant">{subtitle}</p>
        </div>
      </div>
      <span className="material-symbols-outlined text-outline">chevron_right</span>
    </>
  );

  const className =
    "group flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary transition-all cursor-pointer";

  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} role="button" tabIndex={0}>
      {inner}
    </div>
  );
}

function ToggleRow({
  title,
  subtitle,
  defaultOn = false,
}: {
  title: string;
  subtitle: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-label-md text-label-md text-on-surface font-semibold">{title}</p>
        <p className="font-body-md text-[12px] text-on-surface-variant">{subtitle}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          checked={on}
          className="sr-only peer"
          type="checkbox"
          onChange={(e) => setOn(e.target.checked)}
        />
        <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  );
}

export function StitchProfileSettings() {
  const { user, token, applyProfile, refreshUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  if (!user || !token) return null;

  return (
    <ProfilePageShell>
      {token && (
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
      )}

      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">Settings</h1>
      <p className="font-body-md text-on-surface-variant mb-10">
        Manage your account, notifications, and preferences.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-headline-sm text-headline-sm text-primary">Account</h2>
          <div className="space-y-4">
            <button
              className="w-full text-left group flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary transition-all"
              type="button"
              onClick={() => setEditOpen(true)}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-surface-container rounded-lg text-on-surface-variant group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">edit</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-semibold">Edit profile</p>
                  <p className="font-body-md text-[12px] text-on-surface-variant">Name and profile photo</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
            <SettingsRow
              href="/profile/security"
              icon="lock"
              subtitle="Update password and security options"
              title="Security & Password"
            />
            <SettingsRow icon="payments" subtitle="Manage payout methods" title="Payment Methods" />
            <SettingsRow
              href="/seller"
              icon="history"
              subtitle="View listings and activity"
              title="My Listings"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="font-headline-sm text-headline-sm text-primary">Notification preferences</h2>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 space-y-6">
            <ToggleRow
              defaultOn
              subtitle="Market updates and saved home alerts"
              title="Email Notifications"
            />
            <ToggleRow defaultOn subtitle="Instant updates on property inquiries" title="Push Notifications" />
            <ToggleRow subtitle="Periodic news and promotional offers" title="Marketing SMS" />
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 bg-error-container/10 border border-error/20 rounded-2xl">
          <div>
            <h3 className="font-headline-sm text-[20px] text-on-error-container font-semibold">Delete account</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-[500px]">
              Permanently remove your account and all associated data. This action cannot be undone and will cancel
              all active listings.
            </p>
          </div>
          <button
            className="mt-6 md:mt-0 px-6 py-2 border border-error text-error rounded-lg hover:bg-error hover:text-white transition-all font-label-md"
            type="button"
          >
            Delete account
          </button>
        </div>
      </div>
    </ProfilePageShell>
  );
}
