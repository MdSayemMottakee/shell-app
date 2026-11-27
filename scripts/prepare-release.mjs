#!/usr/bin/env node
/**
 * Prepare a Control Plane–compatible publish bundle from Vite dist output.
 *
 * Vite emits remoteEntry.js under dist/assets/. Portal zip publish requires
 * remoteEntry.js at the zip root (see shell-controlplane-integration.md §11).
 *
 * Outputs:
 *   release/       — flat bundle (remoteEntry.js + chunks at directory root)
 *   release.zip    — upload this to Portal → Publish build
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distAssets = path.join(root, 'dist', 'assets');
const releaseDir = path.join(root, 'release');
const zipPath = path.join(root, 'release.zip');
const REMOTE_ENTRY = 'remoteEntry.js';
const IMPORT_ASSETS = /(__federation_import|import)\((['"])\.\/assets\//g;

/** originjs + Vite `base: './'` emits `./assets/chunk.js` from remoteEntry in assets/. */
function rewriteFederationAssetImports(source) {
    return source.replace(IMPORT_ASSETS, '$1($2./');
}

function rewriteRemoteEntry() {
    const entryPath = path.join(releaseDir, REMOTE_ENTRY);
    const before = fs.readFileSync(entryPath, 'utf8');
    const after = rewriteFederationAssetImports(before);
    if (after === before) {
        return;
    }
    fs.writeFileSync(entryPath, after);
    console.log('[prepare-release] rewrote ./assets/ imports in remoteEntry.js');
}

function copyFlatBundle() {
    if (!fs.existsSync(distAssets)) {
        console.error(
            '[prepare-release] dist/assets/ not found. Run `npm run build` (vite build) first.',
        );
        process.exit(1);
    }

    fs.rmSync(releaseDir, { recursive: true, force: true });
    fs.mkdirSync(releaseDir, { recursive: true });

    for (const name of fs.readdirSync(distAssets)) {
        const src = path.join(distAssets, name);
        if (!fs.statSync(src).isFile()) continue;
        fs.copyFileSync(src, path.join(releaseDir, name));
    }

    const entryPath = path.join(releaseDir, REMOTE_ENTRY);
    if (!fs.existsSync(entryPath)) {
        console.error(
            `[prepare-release] ${REMOTE_ENTRY} missing after flattening dist/assets/.`,
        );
        process.exit(1);
    }

    rewriteRemoteEntry();

    const fileCount = fs.readdirSync(releaseDir).length;
    console.log(`[prepare-release] ${fileCount} files → ${path.relative(root, releaseDir)}/`);
    console.log(`[prepare-release] ${REMOTE_ENTRY} at bundle root ✓`);
}

function createZipArchive() {
    fs.rmSync(zipPath, { force: true });

    let zip = spawnSync('zip', ['-rq', zipPath, '.'], {
        cwd: releaseDir,
        stdio: 'inherit',
    });

    if (zip.status !== 0 && process.platform === 'win32') {
        zip = spawnSync(
            'powershell',
            [
                '-NoProfile',
                '-Command',
                `$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${releaseDir}\\*' -DestinationPath '${zipPath}' -Force`,
            ],
            { stdio: 'inherit' },
        );
    }

    if (zip.status !== 0) {
        console.error(
            '[prepare-release] `zip` command failed. Install zip (macOS/Linux) or run:\n' +
                `  cd ${path.relative(process.cwd(), releaseDir)} && zip -r ../release.zip .`,
        );
        process.exit(zip.status ?? 1);
    }

    console.log(`[prepare-release] ${path.relative(root, zipPath)} ready for Portal upload`);
}

copyFlatBundle();
createZipArchive();
