"use client";

import { useEffect, useId, useState } from "react";
import { formatPriceInputValue, parsePriceInputValue } from "@/lib/format/priceInput";

type FormattedPriceInputProps = {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  currencySymbol?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

export function FormattedPriceInput({
  id,
  value,
  onChange,
  currencySymbol = "$",
  placeholder = "0",
  className,
  disabled,
  required,
}: FormattedPriceInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [display, setDisplay] = useState(() => formatPriceInputValue(value));

  useEffect(() => {
    setDisplay(formatPriceInputValue(value));
  }, [value]);

  function handleChange(raw: string) {
    const next = parsePriceInputValue(raw);
    onChange(next);
    setDisplay(next == null ? "" : formatPriceInputValue(next));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
        {currencySymbol}
      </span>
      <input
        className={[className, "pl-8"].filter(Boolean).join(" ")}
        disabled={disabled}
        id={inputId}
        inputMode="numeric"
        placeholder={placeholder}
        required={required}
        type="text"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
