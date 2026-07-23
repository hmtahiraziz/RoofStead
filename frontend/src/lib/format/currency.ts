import { POPULAR_CURRENCIES, type CurrencyCode } from "@/lib/constants/currencies";

export function formatPrice(amount: number, currency: CurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 0,
    }).format(amount);
  } catch {
    const meta = POPULAR_CURRENCIES.find((c) => c.code === currency);
    return `${meta?.symbol ?? currency} ${amount.toLocaleString()}`;
  }
}
