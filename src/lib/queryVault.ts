import { useEffect, useState } from 'react';

export interface VaultQueryBody {
    filter?: Record<string, unknown> | null;
    sort?: string[] | null;
    limit?: number;
    offset?: number;
}

export interface VaultQueryPage<T> {
    items: T[];
    total: number;
    has_more?: boolean;
    next_offset?: number;
}

/** Fired when Shell or Dev Shell publishes/clears window.__GF_* host config. */
export const GF_HOST_CONFIG_EVENT = 'gf:host-config';

function readWorkspaceId(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const id = window.__GF_WORKSPACE_ID__?.trim();
    return id ? id : null;
}

/** Subscribe to the host workspace id. Null until Shell / Dev Shell publishes it. */
export function useHostWorkspaceId(): string | null {
    const [id, setId] = useState<string | null>(() => readWorkspaceId());
    useEffect(() => {
        const sync = () => setId(readWorkspaceId());
        window.addEventListener(GF_HOST_CONFIG_EVENT, sync);
        sync();
        return () => window.removeEventListener(GF_HOST_CONFIG_EVENT, sync);
    }, []);
    return id;
}

export function controlPlaneBase(): string {
    if (typeof window !== 'undefined' && window.__GF_CONTROLPLANE_URL__) {
        return window.__GF_CONTROLPLANE_URL__.replace(/\/$/, '');
    }
    return '/control-plane';
}

export function workspaceId(): string {
    const id = readWorkspaceId();
    if (!id) {
        throw new Error(
            'Workspace is not ready. Wait for the Shell host (or local Dev Shell) to publish the workspace id.',
        );
    }
    return id;
}

/** JSON headers plus the Shell (or Dev Shell) bearer token, when one is available. */
export async function vaultHeaders(): Promise<Headers> {
    const headers = new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
    });
    if (typeof window !== 'undefined' && window.__GF_GET_ACCESS_TOKEN__) {
        const token = await window.__GF_GET_ACCESS_TOKEN__();
        if (token?.trim()) {
            headers.set('Authorization', `Bearer ${token.trim()}`);
        }
    }
    return headers;
}

export function formatVaultError(status: number, text: string): string {
    let detail = text.trim();
    try {
        const parsed = JSON.parse(text) as { detail?: unknown; error?: unknown };
        if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
            detail = parsed.detail.trim();
        } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
            detail = parsed.error.trim();
        }
    } catch {
        // keep raw body
    }
    if (status === 401 && !detail) {
        return 'Not authorized to query vault. In Shell, sign in. Locally, run `gf login` for live data.';
    }
    return detail || `Vault query failed (${status})`;
}

/** POST …/vault/collections/{name}/query. Local Vite attaches `gf token` or fixtures. */
export async function queryCollection<T>(
    name: string,
    body: VaultQueryBody = {},
): Promise<VaultQueryPage<T>> {
    const res = await fetch(
        `${controlPlaneBase()}/v1/workspaces/${workspaceId()}/vault/collections/${encodeURIComponent(name)}/query`,
        {
            method: 'POST',
            headers: await vaultHeaders(),
            body: JSON.stringify({
                filter: body.filter ?? {},
                sort: body.sort ?? null,
                limit: body.limit ?? 50,
                offset: body.offset ?? 0,
            }),
        },
    );
    if (!res.ok) {
        const text = await res.text();
        throw new Error(formatVaultError(res.status, text));
    }
    return (await res.json()) as VaultQueryPage<T>;
}
