"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChatPeerProfilePane } from "@/components/messages/ChatPeerProfilePane";
import { PageBackButton } from "@/components/layout/PageBackButton";
import { StitchMarketHeader } from "@/components/stitch/StitchMarketHeader";
import { apiFetch } from "@/lib/api/client";
import type { CurrencyCode } from "@/lib/constants/currencies";
import { formatPrice } from "@/lib/format/currency";
import {
  formatChatBubbleTime,
  formatMessageTime,
  isSameCalendarDay,
} from "@/lib/format/relativeTime";
import type {
  ChatMessage,
  Conversation,
  ListingContext,
  PeerContext,
} from "@/lib/messages/messagesTypes";
import { userAvatarSrc } from "@/lib/stitch/userAvatar";

const LISTING_THUMB_PLACEHOLDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAZbLDjRtMB-pJlIuwki648Owj4EycAyahKPce0NpQTdp1uLRv5sObc_MKXZo5YnX16qFlDppJPj9i4PtTf18yV0L1fkljsgoVtc9b4GkoqsGjuMEGQga8OtwAAx0MJNCBlO8bJJxFqqQFCs61FmwCFiW4ZQfmeKWyyFJEHGubT3UlxH1vQgRwFkdP0N_ia7OFWyyOOMlzYKFa4Ygl_3U43_SuqLVHFsRXbKpJbW2E0gdfMjY-X-yV03Q";

function listingThumb(url?: string) {
  return url?.trim() ? url : LISTING_THUMB_PLACEHOLDER;
}

function listingPriceLabel(c: { price?: number; listingPrice?: number; currency?: string; listingCurrency?: string } | null): string {
  if (!c) return "";
  const price = "price" in c && c.price != null ? c.price : c.listingPrice;
  const currency = c.currency ?? c.listingCurrency ?? "USD";
  if (price == null) return "";
  return formatPrice(price, currency as CurrencyCode);
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  return isSameCalendarDay(iso, new Date().toISOString());
}

function dateDividerLabel(iso?: string): string {
  if (!iso) return "";
  if (isToday(iso)) return "Today";
  return formatMessageTime(iso);
}

function listingSubtitle(c: Conversation | ListingContext | null): string {
  if (!c) return "";
  let address: string | undefined;
  let city: string | undefined;
  if ("listingTitle" in c) {
    address = c.listingAddress;
    city = c.listingCity;
  } else {
    address = c.address;
    city = c.city;
  }
  const loc = [address, city].filter(Boolean).join(", ");
  const price = listingPriceLabel(c);
  if (loc && price) return `${loc} • ${price}`;
  return loc || price || "";
}

function conversationToListingContext(c: Conversation): ListingContext {
  return {
    id: c.listingId,
    title: c.listingTitle,
    price: c.listingPrice ?? 0,
    currency: c.listingCurrency ?? "USD",
    city: c.listingCity,
    address: c.listingAddress,
    imageUrl: c.listingImageUrl,
  };
}

function ConversationListItem({
  conversation: c,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  const peerAvatar = userAvatarSrc(c.peerAvatarUrl, "small");
  const price = listingPriceLabel(c);

  return (
    <button
      type="button"
      className={`w-full text-left p-4 cursor-pointer transition-all border-b border-outline-variant/30 ${
        active
          ? "bg-primary-container/5 border-l-4 border-l-primary"
          : "hover:bg-surface-container-low border-l-4 border-l-transparent"
      }`}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <Image
            alt=""
            className="w-12 h-12 rounded-full object-cover"
            height={48}
            src={peerAvatar}
            unoptimized={peerAvatar.includes("localhost") || peerAvatar.startsWith("data:")}
            width={48}
          />
          {active && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-surface rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5 gap-2">
            <span
              className={`font-title-lg text-body-md truncate ${active ? "text-primary" : "text-on-surface"}`}
            >
              {c.peerName}
            </span>
            <span className="text-[10px] text-on-surface-variant font-label-md shrink-0">
              {formatMessageTime(c.lastMessageAt)}
            </span>
          </div>
          <p
            className={`text-body-md truncate ${active ? "text-on-surface font-medium" : "text-on-surface-variant"}`}
          >
            {c.lastMessagePreview || c.listingTitle}
          </p>
          <div className="mt-2 flex items-center gap-2 bg-white/50 p-1.5 rounded-lg border border-outline-variant/30">
            <Image
              alt=""
              className="w-10 h-10 rounded object-cover shrink-0"
              height={40}
              src={listingThumb(c.listingImageUrl)}
              unoptimized
              width={40}
            />
            <span className="text-[11px] text-on-surface-variant font-medium truncate">
              {c.listingTitle}
              {price ? ` • ${price}` : ""}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function StitchMessages() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const { token, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeListing, setActiveListing] = useState<ListingContext | null>(null);
  const [activePeer, setActivePeer] = useState<PeerContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [peerPanelOpen, setPeerPanelOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "chat" | "profile">("list");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    apiFetch<{ conversations: Conversation[] }>("/api/messages/conversations", { token })
      .then((data) => {
        setConversations(data.conversations);
        const preferred =
          conversationParam &&
          (data.conversations.some((c) => c.id === conversationParam) || conversationParam.length > 0)
            ? conversationParam
            : data.conversations[0]?.id ?? null;
        setActiveId(preferred);
        if (preferred) setMobilePane("chat");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, authLoading, router, conversationParam]);

  const loadThread = useCallback(
    async (conversationId: string) => {
      if (!token) return;
      try {
        const data = await apiFetch<{
          listing: ListingContext | null;
          peer: PeerContext | null;
          messages: ChatMessage[];
        }>(`/api/messages/conversations/${conversationId}`, { token });
        setActiveListing(data.listing);
        setActivePeer(data.peer);
        setMessages(data.messages);
      } catch {
        setMessages([]);
        setActiveListing(null);
        setActivePeer(null);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.peerName.toLowerCase().includes(q) ||
        c.listingTitle.toLowerCase().includes(q) ||
        c.lastMessagePreview.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const active = conversations.find((c) => c.id === activeId);
  const activeConversation: Conversation | null =
    active ??
    (activeId && activeListing
      ? {
          id: activeId,
          listingId: activeListing.id,
          listingTitle: activeListing.title,
          listingPrice: activeListing.price,
          listingCurrency: activeListing.currency,
          listingCity: activeListing.city,
          listingAddress: activeListing.address,
          listingImageUrl: activeListing.imageUrl,
          peerName: activePeer?.name ?? "Seller",
          peerAvatarUrl: activePeer?.avatarUrl,
          peerVerified: activePeer?.verified,
          lastMessagePreview: messages[messages.length - 1]?.body ?? "",
          lastMessageAt: messages[messages.length - 1]?.createdAt,
        }
      : null);
  const peerName = activePeer?.name ?? activeConversation?.peerName ?? "Conversation";
  const peerAvatar = userAvatarSrc(activePeer?.avatarUrl ?? activeConversation?.peerAvatarUrl, "small");
  const peerVerified = activePeer?.verified ?? activeConversation?.peerVerified;

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!token || !activeId || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const res = await apiFetch<{ message: ChatMessage }>(`/api/messages/conversations/${activeId}`, {
      method: "POST",
      token,
      body: JSON.stringify({ body }),
    });
    const withTime = { ...res.message, createdAt: res.message.createdAt ?? new Date().toISOString() };
    setMessages((prev) => [...prev, withTime]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, lastMessagePreview: body, lastMessageAt: withTime.createdAt }
          : c,
      ),
    );
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setPeerPanelOpen(false);
    setMobilePane("chat");
    router.replace(`/messages?conversation=${encodeURIComponent(id)}`, { scroll: false });
  }

  function openPeerPanel() {
    setPeerPanelOpen(true);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobilePane("profile");
    }
  }

  function closePeerPanel() {
    setPeerPanelOpen(false);
    if (mobilePane === "profile") setMobilePane("chat");
  }

  function onDraftInput(value: string) {
    setDraft(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  const listingCtx =
    activeListing ??
    (activeConversation ? conversationToListingContext(activeConversation) : null);

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md md:overflow-hidden">
      <StitchMarketHeader activeNav="messages" />

      <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop pt-3 shrink-0">
        <PageBackButton fallbackHref="/listings" />
      </div>

      <main className="flex-1 flex overflow-hidden max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop md:pt-2 md:pb-8 gap-gutter min-h-0 md:max-h-[calc(100vh-8.5rem)] pb-20 md:pb-8">
        {/* Sidebar */}
        <aside
          className={`w-full md:w-80 lg:w-96 flex flex-col bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(27,67,50,0.04)] min-h-0 ${
            mobilePane === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h2 className="font-headline-sm text-headline-sm text-primary">Messages</h2>
            <button
              className="material-symbols-outlined text-on-surface-variant p-1 hover:bg-surface-container-high rounded-full"
              type="button"
              aria-label="New message"
              title="Start a conversation from a listing"
            >
              edit_square
            </button>
          </div>
          <div className="p-4 border-b border-outline-variant">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border-none focus:ring-2 focus:ring-primary/10 text-body-md font-body-md placeholder-on-surface-variant outline-none"
                placeholder="Search conversations"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {error && <p className="p-4 text-error text-sm">{error}</p>}
            {filteredConversations.length === 0 && !error && (
              <p className="p-6 text-on-surface-variant font-body-md">
                No conversations yet. Message a seller from a listing page.
              </p>
            )}
            {filteredConversations.map((c) => (
              <ConversationListItem
                key={c.id}
                active={c.id === activeId}
                conversation={c}
                onSelect={() => selectConversation(c.id)}
              />
            ))}
          </div>
        </aside>

        {/* Chat — full width until peer profile is opened */}
        <section
          className={`flex-col bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(27,67,50,0.04)] relative min-h-0 transition-[flex-basis,width] duration-300 ease-out min-w-0 ${
            mobilePane === "chat" ? "flex flex-1" : mobilePane === "list" ? "hidden md:flex md:flex-1" : "hidden md:flex md:flex-1"
          } ${peerPanelOpen ? "" : "md:flex-[1_1_100%]"}`}
        >
          {activeId ? (
            <>
              <header className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center min-h-[5rem]">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    className="md:hidden material-symbols-outlined text-primary p-1 shrink-0"
                    type="button"
                    aria-label="Back to conversations"
                    onClick={() => setMobilePane("list")}
                  >
                    arrow_back
                  </button>
                  <button
                    className="flex items-center gap-3 min-w-0 text-left rounded-lg hover:bg-surface-container-high/80 pr-2 py-1 transition-colors"
                    type="button"
                    onClick={openPeerPanel}
                  >
                    <div className="relative shrink-0">
                      <Image
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                        height={40}
                        src={peerAvatar}
                        unoptimized={peerAvatar.includes("localhost")}
                        width={40}
                      />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-surface rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-title-lg text-body-lg text-primary truncate">{peerName}</h3>
                        {peerVerified && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-container/10 rounded-full border border-primary-container/20 shrink-0">
                            <span
                              className="material-symbols-outlined text-[12px] text-primary"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                            <span className="font-label-md text-[10px] text-primary uppercase tracking-wider">
                              Verified seller
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant font-label-md truncate">
                        {activeConversation?.listingTitle ?? "Listing"} · Tap for profile
                      </p>
                    </div>
                  </button>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <button
                    className={`material-symbols-outlined p-2 rounded-full transition-all ${
                      peerPanelOpen
                        ? "text-primary bg-primary-container/15"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                    type="button"
                    aria-label="Show contact profile"
                    title="Profile"
                    onClick={openPeerPanel}
                  >
                    person
                  </button>
                  <button
                    className="material-symbols-outlined text-on-surface-variant p-2 hover:bg-surface-container-high rounded-full transition-all"
                    type="button"
                    aria-label="Call"
                  >
                    call
                  </button>
                  <button
                    className="material-symbols-outlined text-on-surface-variant p-2 hover:bg-surface-container-high rounded-full transition-all"
                    type="button"
                    aria-label="More options"
                  >
                    more_vert
                  </button>
                </div>
              </header>

              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-surface-bright min-h-0">
                {messages.length === 0 && (
                  <p className="text-center text-on-surface-variant text-body-md py-8">
                    No messages yet. Say hello to start the conversation.
                  </p>
                )}
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const showDate =
                    i === 0 || !isSameCalendarDay(m.createdAt, prev?.createdAt);
                  return (
                    <div key={m.id}>
                      {showDate && m.createdAt && (
                        <div className="flex justify-center mb-6">
                          <span className="px-3 py-1 bg-surface-container rounded-full text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest">
                            {dateDividerLabel(m.createdAt)}
                          </span>
                        </div>
                      )}
                      {m.isMine ? (
                        <div className="flex flex-row-reverse gap-3 max-w-[80%] self-end ml-auto">
                          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center self-end shrink-0">
                            <span className="text-[10px] text-white font-bold">ME</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="p-4 bg-primary text-on-primary rounded-2xl rounded-br-none shadow-sm text-body-md leading-relaxed">
                              {m.body}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="text-[10px] text-on-surface-variant">
                                {formatChatBubbleTime(m.createdAt)}
                              </span>
                              <span
                                className="material-symbols-outlined text-[14px] text-primary"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                check_circle
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 max-w-[80%]">
                          <Image
                            alt=""
                            className="w-8 h-8 rounded-full object-cover self-end shrink-0"
                            height={32}
                            src={peerAvatar}
                            unoptimized
                            width={32}
                          />
                          <div>
                            <div className="p-4 bg-surface-container-high text-on-surface rounded-2xl rounded-bl-none text-body-md leading-relaxed">
                              {m.body}
                            </div>
                            <span className="text-[10px] text-on-surface-variant mt-1 block px-1">
                              {formatChatBubbleTime(m.createdAt)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {listingCtx && (
                <div className="px-6 py-2 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded overflow-hidden border border-outline-variant shrink-0">
                      <Image
                        alt=""
                        className="w-full h-full object-cover"
                        height={40}
                        src={listingThumb(listingCtx.imageUrl)}
                        unoptimized
                        width={40}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary uppercase tracking-wider truncate">
                        {listingCtx.title}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">{listingSubtitle(listingCtx)}</p>
                    </div>
                  </div>
                  <Link
                    className="text-xs font-label-md text-primary hover:underline transition-all shrink-0"
                    href={`/listings/${activeConversation?.listingId ?? ""}`}
                  >
                    View details
                  </Link>
                </div>
              )}

              <footer className="p-4 bg-surface border-t border-outline-variant">
                <form onSubmit={sendMessage}>
                  <div className="flex items-end gap-3 bg-surface-container-low p-2 rounded-xl border border-outline-variant/30 focus-within:border-primary/30 transition-all">
                    <div className="flex gap-1 p-1">
                      <button
                        className="material-symbols-outlined text-on-surface-variant p-1.5 hover:bg-surface-container-high rounded-full transition-all"
                        type="button"
                        aria-label="Attach"
                      >
                        add_circle
                      </button>
                      <button
                        className="material-symbols-outlined text-on-surface-variant p-1.5 hover:bg-surface-container-high rounded-full transition-all"
                        type="button"
                        aria-label="Image"
                      >
                        image
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-body-md font-body-md py-2.5 resize-none placeholder-on-surface-variant outline-none max-h-32"
                      placeholder="Type your message..."
                      rows={1}
                      value={draft}
                      onChange={(e) => onDraftInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <button
                      className="flex items-center justify-center bg-primary-container text-on-primary-container h-10 w-10 rounded-lg hover:shadow-lg active:scale-90 transition-all shrink-0"
                      type="submit"
                    >
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </div>
                </form>
                <p className="text-[10px] text-on-surface-variant mt-2 text-center">
                  Your data and communications are encrypted and secure.
                </p>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant p-8 text-center">
              Select a conversation or message a seller from a listing.
            </div>
          )}
        </section>

        {/* Peer profile — hidden until opened; chat expands to fill this space initially */}
        <aside
          className={`flex-col min-h-0 overflow-hidden transition-all duration-300 ease-out shrink-0 ${
            mobilePane === "profile" ? "flex flex-1 w-full" : "max-md:hidden"
          } ${peerPanelOpen ? "md:flex md:w-72 lg:w-80" : "md:hidden md:w-0"}`}
        >
          {activeConversation && (peerPanelOpen || mobilePane === "profile") && (
            <div className="h-full bg-surface border border-outline-variant rounded-xl p-4 shadow-[0px_4px_20px_rgba(27,67,50,0.04)] overflow-y-auto">
              <ChatPeerProfilePane
                active={activeConversation}
                peerAvatar={peerAvatar}
                peerName={peerName}
                peerVerified={Boolean(peerVerified)}
                onClose={closePeerPanel}
                onOpenProfile={() => openPeerPanel()}
              />
            </div>
          )}
        </aside>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-outline-variant py-2 px-6 flex justify-between items-center z-40">
        <Link className="flex flex-col items-center gap-1 text-on-surface-variant" href="/">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-label-md">Home</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-on-surface-variant" href="/listings">
          <span className="material-symbols-outlined">search</span>
          <span className="text-[10px] font-label-md">Explore</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-primary" href="/messages">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            chat_bubble
          </span>
          <span className="text-[10px] font-label-md">Messages</span>
        </Link>
        <Link className="flex flex-col items-center gap-1 text-on-surface-variant" href="/profile">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="text-[10px] font-label-md">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
