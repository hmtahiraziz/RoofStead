export function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function emailFormula(email: string): string {
  return `{email} = '${escapeAirtableString(email.toLowerCase())}'`;
}
