"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  POPULAR_CURRENCIES,
  getCurrencyMeta,
  type CurrencyCode,
} from "@/lib/constants/currencies";

type Props = {
  id?: string;
  name?: string;
  value: CurrencyCode;
  onChange?: (code: CurrencyCode) => void;
  className?: string;
  disabled?: boolean;
};

export function CurrencySelect({
  id,
  name = "currency",
  value,
  onChange,
  className,
  disabled,
}: Props) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const listboxId = `${triggerId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = getCurrencyMeta(value) ?? POPULAR_CURRENCIES[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectCurrency(code: CurrencyCode) {
    onChange?.(code);
    setOpen(false);
  }

  const triggerClass =
    className ??
    "w-full bg-surface border border-outline-variant rounded-lg p-3 focus-ring font-body-md text-on-surface";

  return (
    <div ref={rootRef} className="relative">
      {name && <input name={name} type="hidden" value={value} />}

      <button
        id={triggerId}
        type="button"
        className={`${triggerClass} flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60`}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md text-primary">
            {selected.symbol}
          </span>
          <span className="truncate">
            <span className="font-label-md text-label-md">{selected.code}</span>
            <span className="mx-2 text-outline-variant">·</span>
            <span className="text-on-surface-variant">{selected.name}</span>
          </span>
        </span>
        <span
          className={`material-symbols-outlined shrink-0 text-on-surface-variant transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest py-2 shadow-lg"
        >
          {POPULAR_CURRENCIES.map((currency) => {
            const isSelected = currency.code === value;
            return (
              <li key={currency.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-container-high ${
                    isSelected ? "bg-primary-fixed/60 text-primary" : "text-on-surface"
                  }`}
                  onClick={() => selectCurrency(currency.code)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-label-md">
                    {currency.symbol}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-label-md text-label-md">{currency.code}</span>
                    <span className="mx-2 text-outline-variant">·</span>
                    <span className="text-on-surface-variant">{currency.name}</span>
                  </span>
                  {isSelected && (
                    <span className="material-symbols-outlined shrink-0 text-primary text-[20px]">check</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
