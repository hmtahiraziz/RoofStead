/**
 * Syncs RoofStead Airtable base with fields required by the Express API.
 *
 * Requires AIRTABLE_API_KEY with schema.bases:read and schema.bases:write.
 *
 *   npm run airtable:sync-schema
 */
import dotenv from "dotenv";
import { AirtableTables } from "../src/lib/airtable/tables";

dotenv.config();

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

type MetaChoice = { id?: string; name: string; color?: string };
type MetaField = {
  id: string;
  name: string;
  type: string;
  options?: { choices?: MetaChoice[]; linkedTableId?: string };
};
type MetaTable = { id: string; name: string; fields: MetaField[] };

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

async function loadTables(): Promise<MetaTable[]> {
  const { tables } = (await metaFetch("/tables")) as { tables: MetaTable[] };
  return tables;
}

function findTable(tables: MetaTable[], name: string) {
  const table = tables.find((t) => t.name === name);
  if (!table) throw new Error(`Table "${name}" not found`);
  return table;
}

function findField(table: MetaTable, name: string) {
  return table.fields.find((f) => f.name === name);
}

async function ensureField(
  table: MetaTable,
  spec: { name: string; type: string; options?: Record<string, unknown> },
) {
  const existing = findField(table, spec.name);
  if (existing) {
    console.log(`  ✓ ${table.name}.${spec.name} already exists`);
    return existing;
  }

  console.log(`  + Creating ${table.name}.${spec.name} (${spec.type})`);
  const created = (await metaFetch(`/tables/${table.id}/fields`, {
    method: "POST",
    body: JSON.stringify(spec),
  })) as MetaField;
  table.fields.push(created);
  return created;
}

async function recordsFetch(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}${path}`, {
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

/** Metadata PATCH cannot update singleSelect choices; use Records API typecast instead. */
async function ensureSelectChoicesViaTypecast(
  tableName: string,
  fieldName: string,
  choices: string[],
  buildTempRecord: (choice: string) => Record<string, unknown>,
) {
  const tables = await loadTables();
  const table = findTable(tables, tableName);
  const field = findField(table, fieldName);
  if (!field) throw new Error(`${tableName}.${fieldName} not found`);

  const existing = new Set((field.options?.choices ?? []).map((c) => c.name));
  const missing = choices.filter((c) => !existing.has(c));
  if (!missing.length) {
    console.log(`  ✓ ${tableName}.${fieldName} select options complete`);
    return;
  }

  console.log(`  ~ Adding ${tableName}.${fieldName} options via typecast: ${missing.join(", ")}`);
  for (const choice of missing) {
    const created = (await recordsFetch(`/${encodeURIComponent(tableName)}`, {
      method: "POST",
      body: JSON.stringify({
        records: [{ fields: buildTempRecord(choice) }],
        typecast: true,
      }),
    })) as { records: { id: string }[] };

    const tempId = created.records[0]?.id;
    if (tempId) {
      await recordsFetch(`/${encodeURIComponent(tableName)}/${tempId}`, { method: "DELETE" });
    }
  }
}

async function main() {
  if (!apiKey || !baseId) {
    console.error("Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in backend/.env");
    process.exit(1);
  }

  let tables = await loadTables();
  const users = findTable(tables, AirtableTables.Users);
  const adminUsers = findTable(tables, AirtableTables.AdminUsers);
  const listings = findTable(tables, AirtableTables.Listings);
  let sellerVerifications = tables.find((t) => t.name === AirtableTables.SellerVerifications);
  let conversations = tables.find((t) => t.name === AirtableTables.Conversations);
  let messages = tables.find((t) => t.name === AirtableTables.Messages);

  const dateTimeOptions = {
    dateFormat: { name: "iso" },
    timeFormat: { name: "24hour" },
    timeZone: "utc",
  };

  console.log("\n=== Users ===");
  await ensureField(users, {
    name: "Intends Seller",
    type: "checkbox",
    options: { icon: "check", color: "greenBright" },
  });
  await ensureField(users, { name: "Refresh Token Hash", type: "singleLineText" });
  await ensureField(users, { name: "Seller Phone", type: "phoneNumber" });
  await ensureField(users, { name: "Seller ID Number", type: "singleLineText" });
  await ensureField(users, { name: "Seller Legal Name", type: "singleLineText" });
  await ensureField(users, {
    name: "Is Active",
    type: "checkbox",
    options: { icon: "check", color: "greenBright" },
  });

  const roleField = findField(users, "Role");
  if (roleField) {
    await ensureSelectChoicesViaTypecast(AirtableTables.Users, "Role", ["Buyer", "Seller"], (choice) => ({
      Email: `schema-sync-${Date.now()}-${Math.random().toString(36).slice(2)}@roofstead.invalid`,
      Name: "__schema_sync_temp__",
      Role: choice,
    }));
  } else {
    await ensureField(users, {
      name: "Role",
      type: "singleSelect",
      options: { choices: [{ name: "Buyer" }, { name: "Seller" }, { name: "buyer" }, { name: "seller" }] },
    });
  }

  const verificationField = findField(users, "Verification Status");
  if (verificationField) {
    await ensureSelectChoicesViaTypecast(
      AirtableTables.Users,
      "Verification Status",
      ["Unverified", "Pending", "Verified", "Rejected"],
      (choice) => ({
        Email: `schema-sync-${Date.now()}-${Math.random().toString(36).slice(2)}@roofstead.invalid`,
        Name: "__schema_sync_temp__",
        "Verification Status": choice,
      }),
    );
  } else {
    await ensureField(users, {
      name: "Verification Status",
      type: "singleSelect",
      options: {
        choices: [
          { name: "Unverified" },
          { name: "Pending" },
          { name: "Verified" },
          { name: "Rejected" },
        ],
      },
    });
  }

  const profileUrl = findField(users, "Profile Picture URL");
  if (profileUrl && profileUrl.type !== "url") {
    console.log(
      `  ! Profile Picture URL exists as ${profileUrl.type}; code expects URL. Consider changing type manually or uploads use text URLs.`,
    );
  } else if (!profileUrl) {
    await ensureField(users, { name: "Profile Picture URL", type: "url" });
  }

  console.log("\n=== AdminUsers ===");
  await ensureField(adminUsers, { name: "refresh_token_hash", type: "singleLineText" });

  console.log("\n=== Listings ===");
  const statusField = findField(listings, "Status");
  if (statusField) {
    await ensureSelectChoicesViaTypecast(
      AirtableTables.Listings,
      "Status",
      ["Active", "Rented", "Sold", "Deleted", "Moderated Hidden"],
      (choice) => ({
        Title: "__schema_sync_temp__",
        Status: choice,
      }),
    );
  }

  console.log("\n=== SellerVerifications ===");
  if (!sellerVerifications) {
    console.log("  + Creating SellerVerifications table");
    const usersTableId = users.id;
    await metaFetch("/tables", {
      method: "POST",
      body: JSON.stringify({
        name: AirtableTables.SellerVerifications,
        fields: [
          {
            name: "User",
            type: "multipleRecordLinks",
            options: { linkedTableId: usersTableId },
          },
          {
            name: "Status",
            type: "singleSelect",
            options: {
              choices: [{ name: "Pending" }, { name: "Approved" }, { name: "Rejected" }],
            },
          },
          { name: "Selfie URL", type: "url" },
          { name: "ID Document URL", type: "url" },
          { name: "Notes", type: "multilineText" },
          { name: "Rejection Reason", type: "multilineText" },
          { name: "Submitted At", type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" } },
        ],
      }),
    });
    tables = await loadTables();
    sellerVerifications = findTable(tables, AirtableTables.SellerVerifications);
  } else {
    await ensureField(sellerVerifications, { name: "Selfie URL", type: "url" });
    await ensureField(sellerVerifications, { name: "ID Document URL", type: "url" });
    await ensureField(sellerVerifications, { name: "Notes", type: "multilineText" });
    await ensureField(sellerVerifications, { name: "Rejection Reason", type: "multilineText" });

    const svStatus = findField(sellerVerifications, "Status");
    if (svStatus) {
      const userRecords = (await recordsFetch(
        `/${encodeURIComponent(AirtableTables.Users)}?maxRecords=1`,
      )) as { records: { id: string }[] };
      const sampleUserId = userRecords.records[0]?.id;
      if (sampleUserId) {
        await ensureSelectChoicesViaTypecast(
          AirtableTables.SellerVerifications,
          "Status",
          ["Pending", "Approved", "Rejected"],
          (choice) => ({
            User: [sampleUserId],
            Status: choice,
          }),
        );
      } else {
        console.log("  ! No Users row found; Status options should already include Pending/Approved/Rejected");
      }
    }

    const submittedAt = findField(sellerVerifications, "Submitted At");
    if (!submittedAt) {
      await ensureField(sellerVerifications, {
        name: "Submitted At",
        type: "dateTime",
        options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
      });
    }

    const reviewedAt = findField(sellerVerifications, "Reviewed At");
    if (!reviewedAt) {
      await ensureField(sellerVerifications, {
        name: "Reviewed At",
        type: "dateTime",
        options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
      });
    }
  }

  console.log("\n=== Conversations ===");
  if (!conversations) {
    console.log("  + Creating Conversations table");
    const usersTableId = users.id;
    const listingsTableId = listings.id;
    await metaFetch("/tables", {
      method: "POST",
      body: JSON.stringify({
        name: AirtableTables.Conversations,
        fields: [
          {
            name: "Listing",
            type: "multipleRecordLinks",
            options: { linkedTableId: listingsTableId },
          },
          {
            name: "Buyer",
            type: "multipleRecordLinks",
            options: { linkedTableId: usersTableId },
          },
          {
            name: "Seller",
            type: "multipleRecordLinks",
            options: { linkedTableId: usersTableId },
          },
          {
            name: "Last Message At",
            type: "dateTime",
            options: dateTimeOptions,
          },
          { name: "Last Message Preview", type: "singleLineText" },
          {
            name: "Buyer Blocked",
            type: "checkbox",
            options: { icon: "check", color: "redBright" },
          },
          {
            name: "Seller Blocked",
            type: "checkbox",
            options: { icon: "check", color: "redBright" },
          },
          { name: "Buyer Deleted At", type: "dateTime", options: dateTimeOptions },
          { name: "Seller Deleted At", type: "dateTime", options: dateTimeOptions },
        ],
      }),
    });
    tables = await loadTables();
    conversations = findTable(tables, AirtableTables.Conversations);
  } else {
    await ensureField(conversations, {
      name: "Listing",
      type: "multipleRecordLinks",
      options: { linkedTableId: listings.id },
    });
    await ensureField(conversations, {
      name: "Buyer",
      type: "multipleRecordLinks",
      options: { linkedTableId: users.id },
    });
    await ensureField(conversations, {
      name: "Seller",
      type: "multipleRecordLinks",
      options: { linkedTableId: users.id },
    });
    await ensureField(conversations, {
      name: "Last Message At",
      type: "dateTime",
      options: dateTimeOptions,
    });
    await ensureField(conversations, { name: "Last Message Preview", type: "singleLineText" });
    await ensureField(conversations, {
      name: "Buyer Blocked",
      type: "checkbox",
      options: { icon: "check", color: "redBright" },
    });
    await ensureField(conversations, {
      name: "Seller Blocked",
      type: "checkbox",
      options: { icon: "check", color: "redBright" },
    });
    await ensureField(conversations, {
      name: "Buyer Deleted At",
      type: "dateTime",
      options: dateTimeOptions,
    });
    await ensureField(conversations, {
      name: "Seller Deleted At",
      type: "dateTime",
      options: dateTimeOptions,
    });
    await ensureField(conversations, {
      name: "Buyer Last Read At",
      type: "dateTime",
      options: dateTimeOptions,
    });
    await ensureField(conversations, {
      name: "Seller Last Read At",
      type: "dateTime",
      options: dateTimeOptions,
    });
    await ensureField(conversations, { name: "Buyer Unread Count", type: "number", options: { precision: 0 } });
    await ensureField(conversations, { name: "Seller Unread Count", type: "number", options: { precision: 0 } });
  }

  console.log("\n=== Messages ===");
  if (!messages) {
    if (!conversations) {
      tables = await loadTables();
      conversations = findTable(tables, AirtableTables.Conversations);
    }
    console.log("  + Creating Messages table");
    await metaFetch("/tables", {
      method: "POST",
      body: JSON.stringify({
        name: AirtableTables.Messages,
        fields: [
          {
            name: "Conversation",
            type: "multipleRecordLinks",
            options: { linkedTableId: conversations!.id },
          },
          {
            name: "Sender",
            type: "multipleRecordLinks",
            options: { linkedTableId: users.id },
          },
          { name: "Body", type: "multilineText" },
          { name: "Sent At", type: "dateTime", options: dateTimeOptions },
          { name: "Image URL", type: "url" },
        ],
      }),
    });
    tables = await loadTables();
    messages = findTable(tables, AirtableTables.Messages);
  } else {
    if (!conversations) {
      conversations = findTable(tables, AirtableTables.Conversations);
    }
    await ensureField(messages, {
      name: "Conversation",
      type: "multipleRecordLinks",
      options: { linkedTableId: conversations.id },
    });
    await ensureField(messages, {
      name: "Sender",
      type: "multipleRecordLinks",
      options: { linkedTableId: users.id },
    });
    await ensureField(messages, { name: "Body", type: "multilineText" });
    await ensureField(messages, { name: "Sent At", type: "dateTime", options: dateTimeOptions });
    await ensureField(messages, { name: "Image URL", type: "url" });
  }

  console.log("\nDone. Airtable schema sync complete.");
}

main().catch((err) => {
  console.error(err);
  console.error(
    "\nIf the Metadata API is blocked, add fields manually using docs/AIRTABLE_SCHEMA.md\n" +
      "or ensure your personal access token has schema.bases:read and schema.bases:write scopes.",
  );
  process.exit(1);
});
