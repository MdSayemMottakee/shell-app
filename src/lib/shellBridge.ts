/**
 * Shell chrome bridge — lets a federated app talk back to the Shell host's
 * chrome (breadcrumb, etc.), mirroring the existing `window.__GF_*` bridge
 * used for host -> remote config (see queryVault.ts's `useHostWorkspaceId`).
 */

/**
 * setBreadcrumbLabel — Sets a dynamic breadcrumb label for the app's current
 * Shell route.
 *
 * Call this once your route knows its real display value (e.g. a contract's
 * name loaded from the vault) instead of leaving the Shell breadcrumb to
 * title-case the raw URL segment (which would show a raw `:id`). The label
 * is keyed to the current path and is cleared automatically by the Shell
 * once the visitor navigates away, so a stale label never leaks onto a
 * different page.
 *
 * No-ops outside the Shell (e.g. if the host bridge has not published yet,
 * or in a bare Dev Shell that hasn't wired one up) — safe to call
 * unconditionally.
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   if (contract?.name) {
 *     setBreadcrumbLabel(contract.name);
 *   }
 * }, [contract?.name]);
 * ```
 */
export function setBreadcrumbLabel(label: string): void {
    if (typeof window === 'undefined' || !window.__GF_SET_BREADCRUMB_LABEL__) {
        return;
    }
    window.__GF_SET_BREADCRUMB_LABEL__(window.location.pathname, label);
}
