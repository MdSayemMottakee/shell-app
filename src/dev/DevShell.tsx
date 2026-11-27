/**
 * DevShell — Standalone development shell for testing without the real Shell.
 *
 * Purpose: Provides a lightweight mock shell environment for local development.
 * Includes a mock AuthProvider (skips OAuth), a role switcher toolbar, and a
 * minimal sidebar layout matching the Shell's structure.
 *
 * Auth is mocked for local UI work. Production Shell supplies real auth.
 * Routes live under `/apps/{slug}/*` so local URLs match production Shell.
 */

import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { LayoutDashboard, FileText, ChevronDown, Activity } from "lucide-react";
import App from "../App";
import { APP_ID } from "../appIdentity";
import { useAppPath } from "../lib/useAppPath";
import { fetchGfDevSession, publishGfDevSession, type GfDevSession } from "./gfDevSession";

/* ────── Mock Auth Context ────── */

/**
 * Mock user profiles for testing different permission levels.
 * Each profile simulates a user with a specific platform role
 * and app-scoped role assignment.
 */
const MOCK_USERS = [
    { id: "dev-admin",   name: "Dev Admin",   email: "admin@dev.local",   role: "org_admin",     appRole: "my_app_admin" },
    { id: "dev-manager", name: "Dev Manager", email: "manager@dev.local", role: "internal_user", appRole: "my_app_manager" },
    { id: "dev-viewer",  name: "Dev Viewer",  email: "viewer@dev.local",  role: "internal_user", appRole: "my_app_viewer" },
    { id: "dev-guest",   name: "Dev Guest",   email: "guest@dev.local",   role: "external_guest", appRole: "" },
];

const DEFAULT_MOCK_USER = MOCK_USERS[0]!;

interface MockAuthContextValue {
    user: typeof MOCK_USERS[number];
    isAuthenticated: boolean;
}

const MockAuthContext = createContext<MockAuthContextValue>({
    user: DEFAULT_MOCK_USER,
    isAuthenticated: true,
});

/** Hook to access the mock auth context (standalone Dev Shell only). */
export const useMockAuth = () => useContext(MockAuthContext);

/* ────── Sidebar ────── */

const navItems = [
    { segment: "home" as const, label: "Home", icon: <LayoutDashboard size={16} /> },
    { segment: "manage" as const, label: "Manage posts", icon: <FileText size={16} /> },
    { segment: "audit" as const, label: "Audit", icon: <Activity size={16} /> },
];

const Sidebar: React.FC = () => {
    const homePath = useAppPath("home");
    const managePath = useAppPath("manage");
    const auditPath = useAppPath("audit");
    const hrefs = { home: homePath, manage: managePath, audit: auditPath };

    return (
    <aside style={{
        width: "220px", background: "#0f172a", color: "#94a3b8",
        display: "flex", flexDirection: "column", padding: "16px 0",
        fontFamily: "Geist Sans, ui-sans-serif, sans-serif", flexShrink: 0,
    }}>
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
                🚀 My App
            </div>
            <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
                Dev Shell
            </div>
        </div>
        <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {navItems.map(({ segment, label, icon }) => (
                <NavLink
                    key={segment}
                    to={hrefs[segment]}
                    style={({ isActive }) => ({
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
                        textDecoration: "none", transition: "all 0.15s",
                        background: isActive ? "#1e293b" : "transparent",
                        color: isActive ? "#f8fafc" : "#94a3b8",
                    })}
                >
                    {icon} {label}
                </NavLink>
            ))}
        </nav>
    </aside>
    );
};

/* ────── Role Switcher Toolbar ────── */

const RoleSwitcher: React.FC<{
    currentUser: typeof MOCK_USERS[0];
    onSwitch: (user: typeof MOCK_USERS[0]) => void;
    vaultLabel: string;
}> = ({ currentUser, onSwitch, vaultLabel }) => {
    const [open, setOpen] = useState(false);

    return (
        <div style={{
            background: "#fef3c7", borderBottom: "1px solid #fbbf24",
            padding: "6px 16px", display: "flex", alignItems: "center",
            gap: "12px", fontSize: "12px", fontFamily: "Inter, sans-serif",
        }}>
            <span style={{ fontWeight: 600, color: "#92400e" }}>🛡️ Dev Shell</span>
            <span style={{ color: "#a16207" }}>Testing as:</span>
            <div style={{ position: "relative" }}>
                <button
                    onClick={() => setOpen(!open)}
                    style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "3px 10px", borderRadius: "6px", fontSize: "12px",
                        background: "#fff", border: "1px solid #d4d4d8", cursor: "pointer",
                        fontWeight: 500,
                    }}
                >
                    {currentUser.name}
                    <span style={{
                        fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                        background: "#e0e7ff", color: "#3730a3", marginLeft: "4px",
                    }}>
                        {currentUser.appRole || currentUser.role}
                    </span>
                    <ChevronDown size={12} />
                </button>
                {open && (
                    <div style={{
                        position: "absolute", top: "100%", left: 0, marginTop: "4px",
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, minWidth: "220px",
                    }}>
                        {MOCK_USERS.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => { onSwitch(user); setOpen(false); }}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    width: "100%", padding: "8px 12px", border: "none", background: "none",
                                    cursor: "pointer", fontSize: "12px", textAlign: "left",
                                    borderBottom: "1px solid #f1f5f9",
                                }}
                            >
                                <span>{user.name}</span>
                                <span style={{
                                    fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                                    background: user.id === currentUser.id ? "#dbeafe" : "#f1f5f9",
                                    color: "#475569",
                                }}>
                                    {user.appRole || user.role}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <span style={{ color: "#a16207", marginLeft: "auto", fontSize: "11px" }}>
                Vault: {vaultLabel} · Auth: mock
            </span>
        </div>
    );
};

/* ────── Dev Shell Layout ────── */

const DevShellLayout: React.FC<{
    currentUser: typeof MOCK_USERS[0];
    onSwitch: (user: typeof MOCK_USERS[0]) => void;
    vaultLabel: string;
}> = ({ currentUser, onSwitch, vaultLabel }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Inter, sans-serif" }}>
        <RoleSwitcher currentUser={currentUser} onSwitch={onSwitch} vaultLabel={vaultLabel} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
                <App />
            </main>
        </div>
    </div>
);

function vaultStatusLabel(session: GfDevSession | null): string {
    if (!session) {
        return "connecting…";
    }
    if (!session.ok) {
        return session.error || "run gf workspaces use";
    }
    if (session.environment === "mock") {
        return "mock data";
    }
    const cell = session.environment ? ` ${session.environment}` : "";
    return `gf session${cell}`;
}

const DevShell: React.FC = () => {
    const [currentUser, setCurrentUser] = useState(DEFAULT_MOCK_USER);
    const [session, setSession] = useState<GfDevSession | null>(null);

    useEffect(() => {
        let cancelled = false;
        void fetchGfDevSession().then((next) => {
            if (cancelled) {
                return;
            }
            publishGfDevSession(next);
            setSession(next);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <MockAuthContext.Provider value={{ user: currentUser, isAuthenticated: true }}>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/apps/:appSlug/*"
                        element={
                            session === null ? (
                                <div
                                    style={{
                                        padding: 32,
                                        fontFamily: "Inter, sans-serif",
                                        color: "#64748b",
                                        fontSize: 14,
                                    }}
                                >
                                    Connecting to Groundfloor…
                                </div>
                            ) : (
                                <DevShellLayout
                                    currentUser={currentUser}
                                    onSwitch={setCurrentUser}
                                    vaultLabel={vaultStatusLabel(session)}
                                />
                            )
                        }
                    />
                    <Route path="*" element={<Navigate to={`/apps/${APP_ID}/home`} replace />} />
                </Routes>
            </BrowserRouter>
        </MockAuthContext.Provider>
    );
};

export default DevShell;
