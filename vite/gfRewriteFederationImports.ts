/**
 * originjs federation + Vite `base: './'` prefixes expose imports with
 * `./assets/` even when remoteEntry.js already lives in assets/. Flattening
 * that folder to the zip root then 404s those chunks in Shell.
 *
 * Strip the prefix so imports stay siblings of remoteEntry.js in both
 * dist/assets/ and the flattened release.zip.
 */
import type { Plugin } from "vite";

const IMPORT_ASSETS = /(__federation_import|import)\((['"])\.\/assets\//g;

export function rewriteFederationAssetImports(source: string): string {
  return source.replace(IMPORT_ASSETS, "$1($2./");
}

export function gfRewriteFederationImportsPlugin(): Plugin {
  return {
    name: "gf-rewrite-federation-imports",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== "chunk") continue;
        const base = item.fileName.split("/").pop();
        if (base !== "remoteEntry.js") continue;
        item.code = rewriteFederationAssetImports(item.code);
      }
    },
  };
}
