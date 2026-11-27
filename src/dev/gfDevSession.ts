/**
 * Standalone Dev Shell session — workspace id from `gf login`, not a pasted JWT.
 * The access token never enters the browser; Vite attaches it on /control-plane.
 * When there is no CLI session, /__gf/dev-session returns workspace `local`
 * (mock fixtures).
 */

import { GF_HOST_CONFIG_EVENT } from "../lib/queryVault";

export type GfDevSession =
    | { ok: true; workspaceId: string; apiUrl: string; environment?: string }
    | { ok: false; error: string };

declare global {
    interface Window {
        __GF_CONTROLPLANE_URL__?: string;
        __GF_WORKSPACE_ID__?: string;
        __GF_GET_ACCESS_TOKEN__?: () => Promise<string | null>;
    }
}

export async function fetchGfDevSession(): Promise<GfDevSession> {
    try {
        const res = await fetch("/__gf/dev-session", { cache: "no-store" });
        if (res.ok) {
            const body = (await res.json()) as GfDevSession;
            if (body && typeof body === "object" && "ok" in body) {
                return body;
            }
        }
    } catch {
        // Fallback for static hosts (Vercel, GitHub Pages) without live Vite dev plugin
    }
    return {
        ok: true,
        workspaceId: "local",
        apiUrl: "",
        environment: "mock",
    };
}

function notifyHostConfig(): void {
    if (typeof window === "undefined") {
        return;
    }
    window.dispatchEvent(new Event(GF_HOST_CONFIG_EVENT));
}

/** Publish workspace + same-origin CP URL. Never publish the access token. */
export function publishGfDevSession(session: GfDevSession): void {
    if (typeof window === "undefined") {
        return;
    }
    if (!session.ok || !session.workspaceId) {
        delete window.__GF_CONTROLPLANE_URL__;
        delete window.__GF_WORKSPACE_ID__;
        notifyHostConfig();
        return;
    }
    window.__GF_CONTROLPLANE_URL__ = "/control-plane";
    window.__GF_WORKSPACE_ID__ = session.workspaceId;
    notifyHostConfig();
}
