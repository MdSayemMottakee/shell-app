/**
 * Dev Entry Point — Standalone rendering with Dev Shell.
 *
 * Purpose: This is the entry point used by `npm run dev` for local
 * development. It renders the App inside the Dev Shell wrapper,
 * providing mock auth and a role switcher toolbar.
 *
 * This file is NOT included in the production build — the Shell
 * loads ./App directly via Module Federation.
 *
 * Side Effects: Renders React root to #root DOM element.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import DevShell from './DevShell';

/* ────── Global Reset ────── */
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Geist Sans', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; background: hsl(220 14% 96%); }
`;

const styleEl = document.createElement('style');
styleEl.textContent = globalStyles;
document.head.appendChild(styleEl);

/* ────── Mount ────── */
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <DevShell />
    </React.StrictMode>
);
