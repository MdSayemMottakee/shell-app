/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CONTROLPLANE_URL?: string;
    readonly VITE_CONTROLPLANE_USE_PROXY?: string;
    readonly VITE_CONTROLPLANE_PROXY_TARGET?: string;
    readonly VITE_SHELL_WORKSPACE_ID?: string;
    /** Pin the flags environment in local dev (Shell sets window.__GF_ENVIRONMENT_ID__). */
    readonly VITE_GF_ENVIRONMENT_ID?: string;
    readonly VITE_DEV_ACCESS_TOKEN?: string;
    readonly VITE_PORT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    __GF_CONTROLPLANE_URL__?: string;
    __GF_WORKSPACE_ID__?: string;
    __GF_GET_ACCESS_TOKEN__?: () => Promise<string | null>;
    /** Control Plane app id of this mounted remote (Shell host). */
    __GF_APP_ID__?: string;
    /** Environment this app is bound to — pass to GET /flags/runtime. */
    __GF_ENVIRONMENT_ID__?: string;
    /** Set by the Shell host; see src/lib/shellBridge.ts's setBreadcrumbLabel(). */
    __GF_SET_BREADCRUMB_LABEL__?: (path: string, label: string) => void;
}

declare module '*.svg' {
    const src: string;
    export default src;
}
