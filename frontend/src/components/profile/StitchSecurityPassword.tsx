"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfilePageShell } from "@/components/profile/ProfilePageShell";
import { apiFetch } from "@/lib/api/client";

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <label
        className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
          lock
        </span>
        <input
          autoComplete={autoComplete}
          className="w-full pl-10 pr-12 py-3 bg-transparent border border-outline-variant rounded-lg font-body-md text-on-surface form-input-focus transition-all"
          id={id}
          minLength={8}
          required
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-outline hover:text-primary"
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          <span className="material-symbols-outlined text-[20px]">{visible ? "visibility_off" : "visibility"}</span>
        </button>
      </div>
    </div>
  );
}

export function StitchSecurityPassword() {
  const { user, token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user || !token) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/me/password", {
        method: "POST",
        token: token!,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfilePageShell>
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
        Security
      </h1>
      <p className="font-body-md text-on-surface-variant mb-8">
        Signed in as <span className="text-on-surface font-medium">{user.email}</span>. Choose a strong password
        you do not use elsewhere.
      </p>

      <form
        className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 md:p-8 space-y-6 card-shadow max-w-[520px]"
        onSubmit={onSubmit}
      >
        <PasswordField
          autoComplete="current-password"
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <PasswordField
          autoComplete="new-password"
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <PasswordField
          autoComplete="new-password"
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <p className="text-[12px] text-on-surface-variant">Use at least 8 characters.</p>

        {error && <p className="text-error text-sm">{error}</p>}
        {success && <p className="text-primary text-sm font-medium">{success}</p>}

        <button
          className="w-full bg-primary text-on-primary font-label-md py-3.5 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="mt-8 font-body-md text-on-surface-variant">
        Forgot your current password?{" "}
        <Link className="text-primary font-semibold hover:underline" href="/auth/forgot-password">
          Reset via email
        </Link>
      </p>
    </ProfilePageShell>
  );
}
