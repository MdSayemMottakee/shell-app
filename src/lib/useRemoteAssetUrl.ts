import { useMemo } from 'react';

/**
 * Resolve a relative asset against the Shell-provided remote base
 * (`data-gf-remote-base` on `.gf-federated-app`). Prefer Vite `import` with
 * `base: './'` for bundled files; use this for runtime paths.
 */
export function useRemoteAssetUrl(path: string): string {
    return useMemo(() => {
        if (!path || /^(https?:|data:|blob:)/i.test(path)) {
            return path;
        }
        const el =
            typeof document !== 'undefined'
                ? document.querySelector('[data-gf-remote-base]')
                : null;
        const base = el?.getAttribute('data-gf-remote-base');
        if (!base) {
            return path;
        }
        try {
            return new URL(path.replace(/^\//, ''), base).toString();
        } catch {
            return path;
        }
    }, [path]);
}
