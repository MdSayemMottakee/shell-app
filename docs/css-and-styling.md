# CSS and styling (Shell + federated apps)

**Audience:** Federated app developers  
**Default stack:** Tailwind CSS v3.4 — same as the Shell host

The Shell host and this starter-kit share one styling contract so deployed remotes look like they belong in the Shell, and so remote CSS does not restyle the sidebar, breadcrumb, or other chrome.

---

## Default: same Tailwind as Shell

| Piece | Starter-kit |
|-------|-------------|
| Tailwind | `^3.4.17` |
| PostCSS | `tailwindcss` + `autoprefixer` |
| Token CSS | `src/index.css` (`@tailwind` layers + scoped reset) |
| App root class | `FederatedAppRoot` (`.gf-federated-app`) |

Rules:

1. Import `./index.css` from `src/App.tsx` so the stylesheet ships in `remoteEntry.js` (`cssCodeSplit: false`).
2. Wrap the app in `FederatedAppRoot` (class `gf-federated-app`). The Shell also wraps the remote in that class.
3. Keep `important: '.gf-federated-app'` in `tailwind.config.js` so utilities apply **only inside the app**.
4. Keep `corePlugins.preflight: false` in the remote. A second Tailwind preflight from the remote resets Shell chrome. This kit ships a **scoped** form-control reset in `@layer base` on `.gf-federated-app` so standalone `npm run dev` is not stuck with bevelled fields. Unlayered CSS after `@tailwind utilities` beats `.border` and hides input/textarea outlines.
5. Shell loads Geist Sans/Mono and a small neutral token set on `.gf-federated-app`. This kit carries the same tokens + reset for standalone.
6. Production federation builds set Vite `base: './'` so imported images resolve next to `remoteEntry.js` after `npm run release`. The Shell sets `data-gf-remote-base` on the mount.
7. Brand colour comes from `groundfloor.manifest.json` `theme.primaryColor` (runtime `--primary`). Header logos should be `theme.logoUrl` (absolute https).

Standalone Dev Shell does not load Shell CSS. The kit reset + tokens cover local `npm run dev`.

---

## Using a different CSS framework (Bootstrap, MUI, CSS Modules, …)

Host Tailwind and a second global framework **will fight** if both inject into `document`. Isolate the remote with **Shadow DOM**.

1. Import the framework CSS as a string:

```ts
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?inline';
```

2. Replace `FederatedAppRoot` with `FederatedStyleRoot`:

```tsx
import { FederatedStyleRoot } from './lib/FederatedStyleRoot';
import vendorCss from './vendor.css?inline';

export default function App() {
    return (
        <FederatedStyleRoot css={vendorCss}>
            {/* pages */}
        </FederatedStyleRoot>
    );
}
```

3. Keep `cssCodeSplit: false` in `vite.config.ts` so CSS is in JS and can be adopted into the shadow root.
4. Do **not** also import that CSS as a global side-effect (`import './bootstrap.css'`) — it would still leak into the Shell.
5. Portals/modals that render to `document.body` will appear **outside** the shadow tree and lose the framework CSS. Render overlays into a node inside `FederatedStyleRoot`.

`FederatedStyleRoot` lives in `src/lib/FederatedStyleRoot.tsx`.

---

## Checklist

- [ ] `src/index.css` imported from `App.tsx`
- [ ] App wrapped in `FederatedAppRoot` (Tailwind) or `FederatedStyleRoot` (other frameworks)
- [ ] Remote Tailwind has `preflight: false` and `important: '.gf-federated-app'`
- [ ] No `to="/page"` links (see routing rules)

See [Design standard](https://docs.groundfloor.cloud/docs/apps/shell/styling) and [CSS and styling](https://docs.groundfloor.cloud/docs/apps/shell/styling).
