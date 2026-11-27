/**
 * Root wrapper for federated UI.
 *
 * Default: light scoping via `.gf-federated-app` so starter-kit Tailwind utilities
 * (`important: '.gf-federated-app'`) apply inside the app and not to Shell chrome.
 *
 * Other CSS frameworks: wrap with {@link FederatedStyleRoot} and pass CSS as a
 * string (`import './vendor.css?inline'`). That mounts a Shadow DOM so host and
 * app styles cannot leak into each other. See docs/controlplane/14-css-and-styling.md.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FEDERATED_APP_ROOT_CLASS } from '../appIdentity';
import { appManifest } from './manifest';
import { applyManifestTheme } from './theme';

export const FederatedAppRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (ref.current) {
            applyManifestTheme(ref.current, appManifest.theme);
        }
    }, []);
    return (
        <div ref={ref} className={`${FEDERATED_APP_ROOT_CLASS} min-h-full`}>
            {children}
        </div>
    );
};

interface FederatedStyleRootProps {
    /** CSS text, typically `import './styles.css?inline'`. */
    css: string;
    children: React.ReactNode;
}

export const FederatedStyleRoot: React.FC<FederatedStyleRootProps> = ({ css, children }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const [mount, setMount] = useState<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        const host = hostRef.current;
        if (!host) {
            return;
        }
        const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
        const sheet = new CSSStyleSheet();
        void sheet.replace(css);
        root.adoptedStyleSheets = [sheet];

        let node = root.querySelector<HTMLDivElement>('[data-gf-app-mount]');
        if (!node) {
            node = document.createElement('div');
            node.setAttribute('data-gf-app-mount', '');
            node.className = `${FEDERATED_APP_ROOT_CLASS} min-h-full`;
            root.appendChild(node);
        }
        setMount(node);
    }, [css]);

    return (
        <div
            ref={hostRef}
            className={FEDERATED_APP_ROOT_CLASS}
            data-gf-style-isolation="shadow"
        >
            {mount ? createPortal(children, mount) : null}
        </div>
    );
};
