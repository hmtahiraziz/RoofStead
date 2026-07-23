import Airtable from "airtable";
import { env } from "../../config/env";

let base: Airtable.Base | null = null;

export function getAirtableBase(): Airtable.Base {
  if (!base) {
    Airtable.configure({ apiKey: env.airtable.apiKey });
    base = Airtable.base(env.airtable.baseId);
  }
  return base;
}
