/**
 * Creates or updates the super admin in Airtable `AdminUsers`.
 *
 * Usage:
 *   npm run seed:admin
 *
 * Requires AdminUsers table with fields: email, password_hash, name, role, is_active
 */
import dotenv from "dotenv";
import "../src/bootstrap/dns";
import {
  createAdminUser,
  findAdminByEmail,
} from "../src/lib/airtable/repositories";
import { hashPassword } from "../src/lib/auth/tokens";
import { AirtableTables } from "../src/lib/airtable/tables";
import { getAirtableBase } from "../src/lib/airtable/client";

dotenv.config();

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "admin@roofstead.local").toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe-SuperAdmin-123!";
  const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin";

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.error("Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in backend/.env");
    process.exit(1);
  }

  const password_hash = await hashPassword(password);
  const existing = await findAdminByEmail(email);

  if (existing) {
    const base = getAirtableBase();
    await base(AirtableTables.AdminUsers).update([
      {
        id: existing.id,
        fields: {
          password_hash,
          name,
          role: "super_admin",
          is_active: true,
        },
      },
    ]);
    console.log("Updated super admin:", email);
  } else {
    await createAdminUser({
      email,
      password_hash,
      name,
      role: "super_admin",
      is_active: true,
    });
    console.log("Created super admin:", email);
  }

  console.log("\nAdmin login:");
  console.log("  POST http://localhost:4000/api/admin/login");
  console.log(`  Body: { "email": "${email}", "password": "<your SUPER_ADMIN_PASSWORD>" }`);
  console.log("\nThen open http://localhost:3000/admin/login and sign in with the same credentials.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
