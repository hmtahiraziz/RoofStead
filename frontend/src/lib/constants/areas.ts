export const AREA_UNITS = [
  { value: "sqft", label: "Square feet (sq ft)" },
  { value: "sqm", label: "Square meters (m²)" },
] as const;

export type AreaUnit = (typeof AREA_UNITS)[number]["value"];

/** Default for new listings (international-friendly; matches multi-currency) */
export const DEFAULT_AREA_UNIT: AreaUnit = "sqm";
