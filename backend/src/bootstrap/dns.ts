import dns from "node:dns";

/**
 * Router DNS (e.g. gpon.net / 192.168.1.1) often fails to resolve api.airtable.com.
 * Node honors dns.setServers() without Windows admin rights.
 */
function parseDnsServers(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null;
  const servers = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return servers.length ? servers : null;
}

const fromEnv = parseDnsServers(process.env.DNS_SERVERS);
const defaultDev = process.env.NODE_ENV === "production" ? null : ["1.1.1.1", "8.8.8.8"];
const servers = fromEnv ?? defaultDev;

if (servers?.length) {
  dns.setServers(servers);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dns] Resolver(s): ${servers.join(", ")}`);
  }
}
