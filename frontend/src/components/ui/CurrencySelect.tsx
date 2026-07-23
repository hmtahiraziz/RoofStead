"use client";

import { POPULAR_CURRENCIES, type CurrencyCode } from "@/lib/constants/currencies";
import styles from "./CurrencySelect.module.css";

type Props = {
  id?: string;
  name?: string;
  value: CurrencyCode;
  onChange?: (code: CurrencyCode) => void;
  className?: string;
  disabled?: boolean;
};

export function CurrencySelect({
  id = "currency",
  name = "currency",
  value,
  onChange,
  className,
  disabled,
}: Props) {
  return (
    <select
      id={id}
      name={name}
      className={[styles.select, className].filter(Boolean).join(" ")}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value as CurrencyCode)}
    >
      {POPULAR_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} — {c.name}
        </option>
      ))}
    </select>
  );
}