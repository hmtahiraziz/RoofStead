/** Airtable table names — keep in sync with docs/AIRTABLE_SCHEMA.md */
export const AirtableTables = {
  Users: "Users",
  AdminUsers: "AdminUsers",
  SellerVerifications: "SellerVerifications",
  Listings: "Listings",
  Conversations: "Conversations",
  Messages: "Messages",
  Favorites: "Favorites",
  Reports: "Reports",
  Notifications: "Notifications",
  SavedSearches: "SavedSearches",
} as const;

export type AirtableTableName = (typeof AirtableTables)[keyof typeof AirtableTables];
