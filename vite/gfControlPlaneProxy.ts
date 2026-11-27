/**
 * Dev-only Control Plane proxy that attaches a fresh `gf token` JWT.
 *
 * The browser never holds the 5-minute access token. Vite runs on the
 * developer laptop (where `gf login` stored ~/.groundfloor), so it can mint
 * a new Bearer on each /control-plane request — the same split Shell uses
 * in production with getAccessToken().
 *
 * apply: 'serve' — never included in the federated production build.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Logger, Plugin } from "vite";
import { tryServeVaultFixture } from "./gfVaultFixtures";

const execFileAsync = promisify(execFile);

const PROXY_PREFIX = "/control-plane";
const SESSION_PATH = "/__gf/dev-session";
const TOKEN_SKEW_MS = 30_000;
const FALLBACK_TTL_MS = 4 * 60 * 1000;
const DEFAULT_CP = "http://localhost:8088";

const DROP_REQ_HEADERS = new Set([
    "host",
    "connection",
    "content-length",
    "authorization",
    "keep-alive",
    "proxy-connection",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
]);

const DROP_RES_HEADERS = new Set([
    "connection",
    "transfer-encoding",
    "keep-alive",
    "content-encoding",
    "content-length",
]);

export type GfCliEnv = {
    token: string;
    apiUrl: string;
    workspaceId: string;
    environment: string;
};

type CachedCli = {
    env: GfCliEnv;
    expiresAtMs: number;
};

let cached: CachedCli | null = null;
let inflight: Promise<GfCliEnv> | null = null;

function gfPathEnv(): NodeJS.ProcessEnv {
    const extra = ["/usr/local/bin", "/opt/homebrew/bin"];
    const PATH = [process.env.PATH, ...extra].filter(Boolean).join(path.delimiter);
    return { ...process.env, PATH };
}

function jwtExpMs(token: string): number | null {
    const payload = token.split(".")[1];
    if (!payload) {
        return null;
    }
    try {
        const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
            exp?: unknown;
        };
        return typeof json.exp === "number" ? json.exp * 1000 : null;
    } catch {
        return null;
    }
}

/** Parse `gf env` export lines. Token is kept for the proxy only — never logged. */
export function parseGfEnvExports(stdout: string): Partial<GfCliEnv> {
    const out: Partial<GfCliEnv> = {};
    for (const raw of stdout.split("\n")) {
        const match = raw.trim().match(/^export\s+([A-Z0-9_]+)=(.*)$/);
        if (!match) {
            continue;
        }
        const key = match[1];
        const value = match[2]?.replace(/^['"]|['"]$/g, "") ?? "";
        if (key === "GROUNDFLOOR_TOKEN") {
            out.token = value;
        } else if (key === "CONTROLPLANE_URL" || key === "NEXT_PUBLIC_API_URL") {
            if (!out.apiUrl) {
                out.apiUrl = value;
            }
        } else if (key === "GROUNDFLOOR_WORKSPACE_ID") {
            out.workspaceId = value;
        } else if (key === "GROUNDFLOOR_ENV") {
            out.environment = value;
        }
    }
    return out;
}

function explicitProxyTarget(): string {
    return (
        process.env.VITE_CONTROLPLANE_PROXY_TARGET?.trim() ||
        process.env.CONTROLPLANE_URL?.trim() ||
        ""
    );
}

function loginHint(detail: string): string {
    return `${detail} Run \`gf login\` (same cell as this app), then retry. Do not paste JWTs into .env.`;
}

async function mintCliEnv(): Promise<GfCliEnv> {
    try {
        const { stdout } = await execFileAsync("gf", ["env"], {
            timeout: 20_000,
            maxBuffer: 1024 * 1024,
            env: gfPathEnv(),
        });
        const parsed = parseGfEnvExports(stdout);
        if (!parsed.token?.trim()) {
            throw new Error("gf env did not print GROUNDFLOOR_TOKEN");
        }
        return {
            token: parsed.token.trim(),
            apiUrl: (explicitProxyTarget() || parsed.apiUrl || DEFAULT_CP).replace(/\/$/, ""),
            workspaceId: parsed.workspaceId?.trim() || "",
            environment: parsed.environment?.trim() || "",
        };
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
            throw new Error(
                "gf CLI not found on PATH. Install with `npm i -g @groundfloorcloud/cli` and run `gf login`.",
            );
        }
        const message = err instanceof Error ? err.message : String(err);
        if (/not logged in/i.test(message)) {
            throw new Error(loginHint("Not logged in to Groundfloor."));
        }
        throw new Error(loginHint(message));
    }
}

async function getCliEnv(): Promise<GfCliEnv> {
    const now = Date.now();
    if (cached && now < cached.expiresAtMs - TOKEN_SKEW_MS) {
        return cached.env;
    }
    if (!inflight) {
        inflight = mintCliEnv()
            .then((env) => {
                const exp = jwtExpMs(env.token);
                cached = {
                    env,
                    expiresAtMs: exp ?? Date.now() + FALLBACK_TTL_MS,
                };
                return env;
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

const NO_WORKSPACE_ERROR =
    "No workspace selected. Run `gf workspaces use <uuid>`. Vault will not use mock data while you are logged in.";

type CliResolution =
    | { status: "ok"; cli: GfCliEnv }
    | { status: "no-workspace"; error: string }
    | { status: "unavailable"; error: string };

async function resolveCli(): Promise<CliResolution> {
    try {
        const cli = await getCliEnv();
        if (!cli.workspaceId) {
            return { status: "no-workspace", error: NO_WORKSPACE_ERROR };
        }
        return { status: "ok", cli };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { status: "unavailable", error: message };
    }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
    const method = req.method?.toUpperCase() ?? "GET";
    if (method === "GET" || method === "HEAD") {
        return undefined;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

async function proxyControlPlane(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
): Promise<void> {
    const resolved = await resolveCli();
    if (resolved.status === "unavailable") {
        const served = await tryServeVaultFixture(req, res, url);
        if (served) {
            return;
        }
        sendJson(res, 401, { ok: false, error: resolved.error });
        return;
    }
    if (resolved.status === "no-workspace") {
        sendJson(res, 400, { ok: false, error: resolved.error });
        return;
    }
    const cli = resolved.cli;

    const suffix = url.slice(PROXY_PREFIX.length) || "/";
    const target = new URL(suffix, `${cli.apiUrl}/`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (!value || DROP_REQ_HEADERS.has(key.toLowerCase())) {
            continue;
        }
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    headers.set("Authorization", `Bearer ${cli.token}`);

    const body = await readBody(req);
    let upstream: Response;
    try {
        upstream = await fetch(target, {
            method: req.method,
            headers,
            body,
            redirect: "manual",
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 502, {
            ok: false,
            error: `Control Plane proxy failed (${cli.apiUrl}): ${message}`,
        });
        return;
    }

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
        if (!DROP_RES_HEADERS.has(key.toLowerCase())) {
            res.setHeader(key, value);
        }
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
}

async function handleDevSession(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const resolved = await resolveCli();
    if (resolved.status === "ok") {
        sendJson(res, 200, {
            ok: true,
            workspaceId: resolved.cli.workspaceId,
            apiUrl: resolved.cli.apiUrl,
            environment: resolved.cli.environment,
        });
        return;
    }
    if (resolved.status === "no-workspace") {
        sendJson(res, 200, { ok: false, error: resolved.error });
        return;
    }
    sendJson(res, 200, {
        ok: true,
        workspaceId: "local",
        apiUrl: "mock",
        environment: "mock",
    });
}

function gfControlPlaneMiddleware(): Connect.NextHandleFunction {
    return (req, res, next) => {
        const url = req.url ?? "";
        const pathname = url.split("?")[0] ?? "";
        if (pathname === SESSION_PATH) {
            void handleDevSession(req, res).catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                sendJson(res, 500, { ok: false, error: message });
            });
            return;
        }
        if (pathname === PROXY_PREFIX || pathname.startsWith(`${PROXY_PREFIX}/`)) {
            void proxyControlPlane(req, res, url).catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                sendJson(res, 502, { ok: false, error: message });
            });
            return;
        }
        next();
    };
}

function attach(
    middlewares: Connect.Server,
    logger: Logger | undefined,
): void {
    middlewares.use(gfControlPlaneMiddleware());
    void resolveCli()
        .then((resolved) => {
            if (resolved.status === "ok") {
                logger?.info(
                    `[gf] /control-plane → ${resolved.cli.apiUrl}` +
                        ` (workspace ${resolved.cli.workspaceId})` +
                        " · token refreshed via gf login session",
                );
                return;
            }
            if (resolved.status === "no-workspace") {
                logger?.warn(`[gf] ${resolved.error}`);
                return;
            }
            logger?.warn(
                `[gf] no CLI session — vault queries use src/dev/fixtures (${resolved.error})`,
            );
        });
}

/**
 * Vite plugin: `/control-plane` + `/__gf/dev-session`.
 * Dev/preview only — production Shell supplies getAccessToken() itself.
 */
export function gfControlPlaneProxyPlugin(): Plugin {
    return {
        name: "gf-control-plane-proxy",
        apply: "serve",
        configureServer(server) {
            attach(server.middlewares, server.config.logger);
        },
        configurePreviewServer(server) {
            attach(server.middlewares, server.config.logger);
        },
    };
}
