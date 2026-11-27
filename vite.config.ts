/**
 * Vite + Module Federation remote for a Groundfloor Shell app.
 *
 * Federation `name` MUST match federationRemoteName(manifest.appId):
 *   my-federated-app → my_federated_app
 *
 * Set APP_ID in src/appIdentity.ts to the same value as `appId` in
 * groundfloor.manifest.json (usually your Portal app slug).
 *
 * Standalone `npm run dev` proxies /control-plane and attaches `gf token`.
 * Do not paste JWTs into .env. This kit is self-contained (no Shell monorepo).
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import { APP_ID } from "./src/appIdentity";
import { gfControlPlaneProxyPlugin } from "./vite/gfControlPlaneProxy";
import { gfRewriteFederationImportsPlugin } from "./vite/gfRewriteFederationImports";
import { gfVaultFixturesPlugin } from "./vite/gfVaultFixtures";

/** Keep in sync with Shell host loadFederatedApp / federationRemoteName */
function federationRemoteName(appId: string): string {
  const sanitized = appId.replace(/[^a-zA-Z0-9_$]/g, "_");
  return sanitized.length > 0 ? sanitized : "federatedApp";
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.VITE_CONTROLPLANE_PROXY_TARGET && !process.env.VITE_CONTROLPLANE_PROXY_TARGET) {
    process.env.VITE_CONTROLPLANE_PROXY_TARGET = env.VITE_CONTROLPLANE_PROXY_TARGET;
  }

  return {
    base: command === "build" ? "./" : "/",
    plugins: [
      ...(mode === "fixtures" ? [gfVaultFixturesPlugin()] : []),
      gfControlPlaneProxyPlugin(),
      react(),
      federation({
        name: federationRemoteName(APP_ID),
        filename: "remoteEntry.js",
        exposes: {
          "./App": "./src/App.tsx",
        },
        shared: {
          react: { singleton: true, requiredVersion: "^19.0.0" },
          "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
          "react-router-dom": { singleton: true, requiredVersion: "^7.0.0" },
        },
      }),
      gfRewriteFederationImportsPlugin(),
    ],
    build: {
      target: "esnext",
      minify: false,
      cssCodeSplit: false,
    },
    server: {
      port: 4175,
      cors: true,
    },
  };
});
