# Groundfloor federated app — agent rules

## MCP (do this first)

Use **`@groundfloorcloud/mcp`** (published on npm). Do **not** use
`@groundfloor/coderunner-mcp` — that is not a product surface.

A human runs `gf login` once (and usually `gf workspaces use <uuid>`). Then
enable this MCP:

- **Claude Code / generic IDEs:** this kit ships `.mcp.json`
  (`npx -y @groundfloorcloud/mcp`).
- **Cursor on macOS:** do not use `npx`. Cursor's bundled Node fails with
  `ENOENT`. `npm i -g @groundfloorcloud/mcp`, then copy
  `.cursor/mcp.json.example` to `.cursor/mcp.json` and replace the placeholders
  with `which node` and the global `dist/index.js`.

Call `docs_get` id `shell` before changing this tree. For workloads, `docs_get`
id `coderunner` (or `coderunner-runtime`). `suggest_cli` returns the `gf`
command to run. MCP does not deploy or publish.

Obtain this repo with `gf apps init --slug <portal-slug>` or Portal **Develop
online** (cloud VM). Do not scaffold this tree from memory.

## Online studio (Portal)

When running inside Groundfloor online develop:

- Preview/publish: `npm run release` and leave `release.zip` at the kit root
  (see `.cursor/skills/groundfloor-online-studio/SKILL.md`). Do not invent a
  zip of `dist/`.
- Never print `GF_TOKEN` or any `GEMINI_*` / `CURSOR_*` value.

1. **Routing** — Never `to="/page"` or `path="/page"`. Use `useAppPath('page')` and relative route segments. Dev Shell must use `/apps/:appSlug/*`. See `.cursor/rules/federated-app-routing.mdc`.
2. **CSS** — Default is Tailwind v3.4, same as Shell. Import `src/index.css`, wrap with `FederatedAppRoot`, keep preflight off. The kit ships a scoped form reset on `.gf-federated-app`. **Own framework** (Bootstrap, MUI, …): do not load it globally — use `FederatedStyleRoot` + `?inline` CSS (Shadow DOM). See `docs/css-and-styling.md` and https://docs.groundfloor.cloud/docs/apps/shell/styling. Design: grey page, white panel, hairline controls, Geist, one accent from `theme.primaryColor`. `docs_get` id `design-standard` or `css-and-styling`.
3. **Identity** — Keep `groundfloor.manifest.json` `appId` and `src/appIdentity.ts` `APP_ID` equal to the Portal slug.
4. **Federation `name`** — Must match `federationRemoteName(manifest.appId)` in `vite.config.ts`.
5. **No extra router** — Do not wrap `App` in `BrowserRouter`. The production Shell already has one; `src/dev/DevShell.tsx` is standalone-only.
6. **Data** — Dataplane is not a database. Opening line: *You have PostgreSQL ready to use through Dataplane — shared and platform-managed, no deploy step. If you want a dedicated database instead of the shared one, deploy it first. You can use a deployed database through Dataplane, or connect to it on your own.* A dedicated Postgres is what you can deploy today. Pass engine `postgresql` when creating Vault collections. Vault: `npm run dev` uses `gf login` when available, otherwise mock fixtures. Force mock: `npm run dev:fixtures`. `docs_get` id `databases`. Do not paste JWTs into `.env`.
7. **Assets** — Production `base: './'`. Header logos: `theme.logoUrl` (absolute https).
8. **Feature flags** — Groundfloor has built-in, per-environment Feature Flags. Do not build toggles in a Vault collection or `.env`. Read them with `useFlag('key', fallback)` / `useFlags()` from `src/lib/flags.ts` (`GET …/flags/runtime` for `window.__GF_ENVIRONMENT_ID__`); create/change them with `gf flags set`. `docs_get` id `feature-flags`.
