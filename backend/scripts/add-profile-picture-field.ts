/**
 * Adds "Profile Picture URL" (url) to the Users table via Airtable Metadata API.
 *
 * Requires a personal access token with schema.bases:read and schema.bases:write
 * (same AIRTABLE_API_KEY if it has those scopes).
 *
 *   npm run airtable:profile-picture-field
 */
import dotenv from "dotenv";
import { AirtableTables } from "../src/lib/airtable/tables";

dotenv.config();

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;
const FIELD_NAME = "Profile Picture URL";

async function metaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error?.message === "string" ? body.error.message : JSON.stringify(body));
  }
  return body;
}

async function main() {
  if (!apiKey || !baseId) {
    console.error("Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in backend/.env");
    process.exit(1);
  }

  const { tables } = (await metaFetch("/tables")) as {
    tables: { id: string; name: string; fields: { name: string }[] }[];
  };

  const usersTable = tables.find((t) => t.name === AirtableTables.Users);
  if (!usersTable) {
    console.error(`Table "${AirtableTables.Users}" not found in this base.`);
    process.exit(1);
  }

  const exists = usersTable.fields.some((f) => f.name === FIELD_NAME);
  if (exists) {
    console.log(`Field "${FIELD_NAME}" already exists on ${AirtableTables.Users}.`);
    return;
  }

  await metaFetch(`/tables/${usersTable.id}/fields`, {
    method: "POST",
    body: JSON.stringify({
      name: FIELD_NAME,
      type: "url",
    }),
  });

  console.log(`Created URL field "${FIELD_NAME}" on table ${AirtableTables.Users}.`);
  console.log("Profile photo uploads will now persist on each user record.");
}

main().catch((err) => {
  console.error(err);
  console.error(
    "\nIf the Metadata API is blocked, add the field manually in Airtable:\n" +
      `  Table: ${AirtableTables.Users}\n` +
      `  Field name: ${FIELD_NAME}\n` +
      "  Type: URL\n",
  );
  process.exit(1);
});
