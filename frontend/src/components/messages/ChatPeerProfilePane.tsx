"use client";

import Image from "next/image";
import type { Conversation } from "@/lib/messages/messagesTypes";

type Props = {
  peerName: string;
  peerAvatar: string;
  peerVerified: boolean;
  active: Conversation;
  onClose: () => void;
};

export function ChatPeerProfilePane({
  peerName,
  peerAvatar,
  peerVerified,
  active,
  onClose,
}: Props) {
  return (
    <div className="flex flex-col gap-gutter h-full min-h-0">
      <div className="flex items-center justify-between lg:hidden mb-1">
        <h3 className="font-headline-sm text-primary">Contact profile</h3>
        <button
          className="material-symbols-outlined text-on-surface-variant p-2 hover:bg-surface-container-high rounded-full"
          type="button"
          aria-label="Close profile"
          onClick={onClose}
        >
          close
        </button>
      </div>
      <button
        className="hidden lg:flex self-end material-symbols-outlined text-on-surface-variant p-1.5 hover:bg-surface-container-high rounded-full -mt-1 -mr-1"
        type="button"
        aria-label="Collapse profile panel"
        onClick={onClose}
      >
        close
      </button>

      <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col items-center text-center shrink-0">
        <Image
          alt=""
          className="w-20 h-20 rounded-full object-cover mb-4 ring-4 ring-primary/5"
          height={80}
          src={peerAvatar}
          unoptimized
          width={80}
        />
        <h4 className="font-headline-sm text-title-lg text-primary mb-1">{peerName}</h4>
        <p className="text-body-md text-on-surface-variant mb-4">
          {peerVerified ? "Verified seller on RoofStead" : "RoofStead member"}
        </p>
        <div className="flex gap-2 w-full">
          <a
            className="flex-1 py-2 px-3 bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container transition-all text-center"
            href={`mailto:?subject=${encodeURIComponent(`RoofStead — ${active.listingTitle}`)}`}
          >
            Email
          </a>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm flex-1 min-h-0 overflow-y-auto">
        <h4 className="font-label-md text-primary uppercase tracking-widest mb-4">Shared documents</h4>
        <p className="text-body-md text-on-surface-variant text-sm">
          Document sharing is coming soon. Attach files in chat when the feature is enabled.
        </p>
        <button
          className="w-full mt-6 py-3 text-primary font-label-md border-t border-outline-variant flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
          disabled
          type="button"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add document
        </button>
      </div>
    </div>
  );
}
