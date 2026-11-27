---
name: groundfloor-online-studio
description: Produce release.zip at the kit root for Portal preview/publish.
---

# Online studio (Antigravity sandbox)

You are in a Groundfloor Portal **Develop online** workspace. The kit is already
initialized under `/workspace`. Do not scaffold a new Vite app.

## Preview or publish

```bash
npm run release
```

Leave `release.zip` at the kit root (`/workspace/release.zip`). Optionally also
copy it to `artifacts/studio/release.zip`. The zip must have `remoteEntry.js` at
the zip root (kit `npm run release` already does this). Do not zip `dist/`.

If `GF_API_URL` and `GF_TOKEN` are set you may call Control Plane
`releases/upload-url` → `PUT …/content` → `finalize`. Never echo those values
or any `GEMINI_*` key. Control Plane also pulls `release.zip` from the sandbox
snapshot when the VM cannot reach the API.
