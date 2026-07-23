#!/usr/bin/env node
/**
 * Pull Stitch screen HTML into frontend/stitch-export/
 *
 * Usage:
 *   set STITCH_API_KEY=...   (Windows)
 *   node scripts/sync-stitch-design.mjs
 *
 * Or rely on Cursor MCP key in %USERPROFILE%\.cursor\mcp.json (stitch server).
 */
import { mkdir, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ID = process.env.STITCH_PROJECT_ID ?? "18354210524743888148";
const MCP_URL = "https://stitch.googleapis.com/mcp";

function resolveApiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  try {
    const mcpPath = join(homedir(), ".cursor", "mcp.json");
    const raw = readFileSync(mcpPath, "utf8");
    const key = JSON.parse(raw)?.mcpServers?.stitch?.headers?.["X-Goog-Api-Key"];
    if (key) return key;
  } catch {
    /* ignore */
  }
  return null;
}

const API_KEY = resolveApiKey();
if (!API_KEY) {
  console.error("Missing STITCH_API_KEY. See docs/STITCH_SYNC.md");
  process.exit(1);
}

async function callTool(name, args) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-Goog-Api-Key": API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

const outDir = join(process.cwd(), "stitch-export");
mkdir(outDir, { recursive: true });

const listResult = await callTool("list_screens", { projectId: PROJECT_ID });
writeFileSync(join(outDir, "screens-response.json"), JSON.stringify(listResult, null, 2));

const screens = listResult.structuredContent?.screens ?? [];
const manifest = [];

for (const screen of screens) {
  const id = String(screen.name).split("/").pop();
  const slug = String(screen.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const entry = { id, title: screen.title, slug };
  if (screen.htmlCode?.downloadUrl) {
    const html = await fetch(screen.htmlCode.downloadUrl).then((r) => r.text());
    const file = `${slug}.html`;
    writeFileSync(join(outDir, file), html, "utf8");
    entry.htmlFile = file;
  }
  manifest.push(entry);
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Synced ${manifest.filter((m) => m.htmlFile).length} HTML screens to ${outDir}`);
