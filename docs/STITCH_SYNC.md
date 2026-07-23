# Sync design from Google Stitch

Project: [18354210524743888148](https://stitch.withgoogle.com/projects/18354210524743888148)

Official HTML exports live in `frontend/stitch-export/` (sync via script below). The app UI uses the same Tailwind tokens and components as those exports.

## Troubleshooting (Windows)

If `stitch-mcp doctor` reports:

- **Missing quota_project_id** — run (use your GCP project ID):
  ```bash
  C:\Users\ADMIN\.stitch-mcp\google-cloud-sdk\bin\gcloud.cmd auth application-default set-quota-project YOUR_GCP_PROJECT_ID
  ```
- **No project configured** — finish setup interactively:
  ```bash
  npx @_davideast/stitch-mcp init -c cursor
  ```
  Choose **OAuth** if you already signed in via the browser, or **API Key** from [Stitch MCP setup](https://stitch.withgoogle.com/docs/mcp/setup).

Until init completes, `screens -p 18354210524743888148` will return “Authentication failed”.


1. Follow [Stitch MCP setup](https://stitch.withgoogle.com/docs/mcp/setup) and create an API key.
2. In Cursor **Settings → MCP**, add the Stitch server (see [@davideast/stitch-mcp](https://github.com/davideast/stitch-mcp)):

   ```bash
   npx @_davideast/stitch-mcp init -y --defaults -c cursor
   ```

3. Re-open the chat and ask to implement from `fetch_screen_code` / `fetch_design_md`.

## Option B — CLI export

```bash
# After init / API key in env
npx @_davideast/stitch-mcp screens -p 18354210524743888148
npx @_davideast/stitch-mcp tool get_screen_code -d "{\"projectId\":\"18354210524743888148\",\"screenId\":\"<id>\"}"
```

Save HTML under `frontend/stitch-export/` and map components to Next.js routes.

## Option C — Manual

From Stitch project settings, export **DESIGN.md** and screen HTML into `frontend/stitch-export/`.

## Color overrides only

Layout/spacing/typography come from Stitch exports. Brand colors live in `frontend/src/app/globals.css` (`--rs-*` tokens). Change tokens there without altering Stitch structure.
