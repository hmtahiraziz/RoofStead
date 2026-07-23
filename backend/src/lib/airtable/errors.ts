export function airtableErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "error" in err) {
    return String((err as { error: string }).error);
  }
  if (err instanceof Error && err.message.includes("NOT_AUTHORIZED")) {
    return "NOT_AUTHORIZED";
  }
  return undefined;
}

export function isAirtableNotAuthorized(err: unknown): boolean {
  return airtableErrorCode(err) === "NOT_AUTHORIZED";
}

export function isAirtableUnknownField(err: unknown): boolean {
  return airtableErrorCode(err) === "UNKNOWN_FIELD_NAME";
}

const NETWORK_ERROR_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"]);

/** DNS / TCP failures when calling api.airtable.com (not Airtable API error payloads). */
export function isAirtableNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code && NETWORK_ERROR_CODES.has(code)) return true;
  const reason = (err as { reason?: { code?: string } }).reason;
  if (reason?.code && NETWORK_ERROR_CODES.has(reason.code)) return true;
  if (err instanceof Error && /getaddrinfo ENOTFOUND|ECONNREFUSED|ETIMEDOUT/.test(err.message)) {
    return true;
  }
  return false;
}

export const SELLER_VERIFICATIONS_SETUP_HINT =
  "Could not read the SellerVerifications table. In Airtable, add a table named SellerVerifications (see docs/AIRTABLE_SCHEMA.md) and ensure your personal access token has data.records:read and data.records:write on this base.";

export const SELLER_VERIFICATIONS_FIELDS_HINT =
  'SellerVerifications is missing expected columns. Add at least: User (link), Status (single select: pending, approved, rejected), Selfie URL, ID Document URL, Submitted At (date). See docs/AIRTABLE_SCHEMA.md.';
