"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

export function UserAccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const avatar = userAvatarSrc(user.profile_picture_url, "small");

  function signOut() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full border border-outline-variant p-0.5 pr-2 hover:border-primary transition-colors focus-ring"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="h-9 w-9 rounded-full overflow-hidden shrink-0">
          <Image
            alt=""
            className="w-full h-full object-cover"
            height={36}
            src={avatar}
            unoptimized={Boolean(user.profile_picture_url?.includes("localhost"))}
            width={36}
          />
        </span>
        <span className="hidden sm:block font-label-md text-on-surface max-w-[8rem] truncate">{user.name}</span>
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-[60]"
          role="menu"
        >
          <div className="px-4 py-2 border-b border-outline-variant/60 mb-1">
            <p className="font-label-md text-on-surface truncate">{user.name}</p>
            <p className="text-[12px] text-on-surface-variant truncate">{user.email}</p>
          </div>
          <Link
            className="flex items-center gap-3 px-4 py-2.5 font-body-md text-on-surface hover:bg-surface-container-high transition-colors"
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">person</span>
            Profile
          </Link>
          <Link
            className="flex items-center gap-3 px-4 py-2.5 font-body-md text-on-surface hover:bg-surface-container-high transition-colors"
            href="/profile/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">settings</span>
            Settings
          </Link>
          <div className="my-1 h-px bg-outline-variant/60" role="separator" />
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 font-body-md text-error hover:bg-error-container/20 transition-colors text-left"
            role="menuitem"
            type="button"
            onClick={signOut}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
