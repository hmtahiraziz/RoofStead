export function formatPriceInputValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-US");
}

export function parsePriceInputValue(raw: string): number | null {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
