import { useEffect, useState } from 'react';
import {
    controlPlaneBase,
    formatVaultError,
    GF_HOST_CONFIG_EVENT,
    useHostWorkspaceId,
    vaultHeaders,
    workspaceId,
} from './queryVault';

/**
 * Feature flags — read-only, from Control Plane `GET …/flags/runtime`.
 *
 * Use this instead of rolling your own toggles in a Vault collection. Flags are
 * managed in the Portal (Feature Flags page) or with `gf flags set`; each
 * environment (dev / staging / prod) has its own values.
 *
 * Environment: in the Shell, `window.__GF_ENVIRONMENT_ID__` is the environment
 * this app is bound to. In local Dev Shell it is unset, so Control Plane uses
 * the workspace default (usually `dev`). Set `VITE_GF_ENVIRONMENT_ID` to pin one.
 *
 * Flag values are not secrets — every signed-in user of the workspace can read them.
 */

export type FlagValue = boolean | string | number | null | FlagValue[] | { [key: string]: FlagValue };
export type FlagMap = Record<string, FlagValue>;

export interface FlagSnapshot {
    environmentId: string;
    flags: FlagMap;
    etag: string | null;
}

/** How often {@link useFlags} re-checks. Control Plane answers 304 when nothing changed. */
export const FLAGS_POLL_MS = 60_000;

export function hostEnvironmentId(): string | null {
    if (typeof window !== 'undefined') {
        const fromShell = window.__GF_ENVIRONMENT_ID__?.trim();
        if (fromShell) {
            return fromShell;
        }
    }
    const fromEnv = import.meta.env.VITE_GF_ENVIRONMENT_ID?.trim();
    return fromEnv ? fromEnv : null;
}

/**
 * GET …/flags/runtime. Pass the previous snapshot to revalidate: returns it
 * unchanged on 304. Throws on 401/403/404/409 with Control Plane's detail.
 */
export async function listFlags(previous?: FlagSnapshot | null): Promise<FlagSnapshot> {
    const envId = hostEnvironmentId();
    const qs = envId ? `?${new URLSearchParams({ environment_id: envId })}` : '';
    const headers = await vaultHeaders();
    headers.delete('Content-Type');
    if (previous?.etag) {
        headers.set('If-None-Match', previous.etag);
    }
    const res = await fetch(
        `${controlPlaneBase()}/v1/workspaces/${workspaceId()}/flags/runtime${qs}`,
        { headers },
    );
    if (res.status === 304 && previous) {
        return previous;
    }
    if (!res.ok) {
        const text = await res.text();
        throw new Error(formatVaultError(res.status, text));
    }
    const body = (await res.json()) as { environment_id: string; flags: FlagMap };
    return { environmentId: body.environment_id, flags: body.flags, etag: res.headers.get('ETag') };
}

/** One flag, or `fallback` when it is not set in this environment. */
export async function getFlag<T extends FlagValue>(key: string, fallback: T): Promise<T> {
    const { flags } = await listFlags();
    return key in flags ? (flags[key] as T) : fallback;
}

export interface UseFlagsResult {
    flags: FlagMap;
    environmentId: string | null;
    loading: boolean;
    error: string | null;
}

/**
 * All flags for this app's environment. Waits for the Shell host config, then
 * polls every {@link FLAGS_POLL_MS} with ETag revalidation. On error keeps the
 * last good values (so UI falls back to defaults, never crashes).
 */
export function useFlags(pollMs: number = FLAGS_POLL_MS): UseFlagsResult {
    const wsId = useHostWorkspaceId();
    const [envKey, setEnvKey] = useState<string | null>(() => hostEnvironmentId());
    const [snapshot, setSnapshot] = useState<FlagSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const sync = () => setEnvKey(hostEnvironmentId());
        window.addEventListener(GF_HOST_CONFIG_EVENT, sync);
        return () => window.removeEventListener(GF_HOST_CONFIG_EVENT, sync);
    }, []);

    useEffect(() => {
        if (!wsId) {
            return;
        }
        let cancelled = false;
        let last: FlagSnapshot | null = null;
        const load = async () => {
            try {
                const next = await listFlags(last);
                last = next;
                if (!cancelled) {
                    setSnapshot(next);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                }
            }
        };
        void load();
        const timer = pollMs > 0 ? window.setInterval(load, pollMs) : undefined;
        return () => {
            cancelled = true;
            if (timer !== undefined) {
                window.clearInterval(timer);
            }
        };
    }, [wsId, envKey, pollMs]);

    return {
        flags: snapshot?.flags ?? {},
        environmentId: snapshot?.environmentId ?? null,
        loading: snapshot === null && error === null,
        error,
    };
}

/** `const newCheckout = useFlag('new-checkout', false);` */
export function useFlag<T extends FlagValue>(key: string, fallback: T): T {
    const { flags } = useFlags();
    return key in flags ? (flags[key] as T) : fallback;
}
