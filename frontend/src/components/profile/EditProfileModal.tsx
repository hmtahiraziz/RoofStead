"use client";

import Image from "next/image";
import { ChangeEvent, useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { apiFetch, apiUpload } from "@/lib/api/client";
import { getCroppedImageBlob, readFileAsDataUrl } from "@/lib/image/cropImage";
import type { StoredUser } from "@/lib/auth/session";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

type Props = {
  open: boolean;
  user: StoredUser;
  token: string;
  onClose: () => void;
  onSaved: (user: StoredUser) => void | Promise<void>;
};

export function EditProfileModal({ open, user, token, onClose, onSaved }: Props) {
  const [name, setName] = useState(user.name);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    setImageSrc(dataUrl);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      let nextUser = user;

      if (name.trim() !== user.name) {
        const res = await apiFetch<{ user: StoredUser }>("/api/auth/me", {
          method: "PATCH",
          token,
          body: JSON.stringify({ name: name.trim() }),
        });
        nextUser = res.user;
      }

      if (imageSrc && croppedAreaPixels) {
        const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, "image/jpeg");
        const form = new FormData();
        form.append("avatar", blob, "avatar.jpg");
        const upload = await apiUpload<{ user: StoredUser }>("/api/auth/me/avatar", form, token);
        nextUser = upload.user;
      }

      onSaved(nextUser);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const previewSrc = userAvatarSrc(nextPreviewUrl(user, imageSrc));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl ambient-shadow border border-outline-variant overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-headline-sm text-headline-sm text-primary" id="edit-profile-title">
            Edit profile
          </h2>
          <button
            className="text-on-surface-variant hover:text-primary p-1"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-outline-variant shrink-0">
              <Image
                alt=""
                className="object-cover w-full h-full"
                height={80}
                src={previewSrc}
                unoptimized
                width={80}
              />
            </div>
            <div>
              <label className="inline-flex cursor-pointer bg-surface-container-high hover:bg-surface-container px-4 py-2 rounded-lg font-label-md text-primary border border-outline-variant transition-colors">
                Choose photo
                <input accept="image/*" className="sr-only" type="file" onChange={onPickFile} />
              </label>
              <p className="text-[12px] text-on-surface-variant mt-2">JPG or PNG, up to 5 MB. Drag to crop.</p>
            </div>
          </div>

          {imageSrc && (
            <div className="space-y-3">
              <div className="relative h-64 w-full rounded-xl overflow-hidden bg-surface-container-high">
                <Cropper
                  aspect={1}
                  crop={crop}
                  cropShape="round"
                  image={imageSrc}
                  showGrid={false}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <label className="font-label-md text-on-surface-variant block">
                Zoom
                <input
                  className="w-full mt-2 accent-primary"
                  max={3}
                  min={1}
                  step={0.05}
                  type="range"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-label-md text-on-surface-variant uppercase tracking-wider" htmlFor="edit-name">
              Display name
            </label>
            <input
              className="w-full border border-outline-variant rounded-lg p-3 focus-ring bg-surface"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <button
            className="px-5 py-2.5 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 rounded-lg font-label-md bg-primary text-on-primary disabled:opacity-60"
            disabled={saving || !name.trim()}
            type="button"
            onClick={save}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function nextPreviewUrl(user: StoredUser, pendingCropSrc: string | null): string | undefined {
  if (pendingCropSrc) return pendingCropSrc;
  return user.profile_picture_url;
}
