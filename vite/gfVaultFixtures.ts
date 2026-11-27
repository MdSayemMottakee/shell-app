/**
 * Dev-only vault query fixtures. Enabled with `vite --mode fixtures`, and as
 * a fallback from the Control Plane proxy when there is no `gf login` session.
 * Answers POST …/vault/collections/<name>/query from src/dev/fixtures/<name>.json
 * and leaves every other Control Plane route to the gf-token proxy.
 *
 * Logged-in vault 404s must NOT fall through here — only the proxy's
 * "no CLI session" path calls tryServeVaultFixture.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const QUERY_RE = /\/vault\/collections\/([^/]+)\/query\/?$/;

type FixtureRow = Record<string, unknown>;

function fixturesDir(): string {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, '../src/dev/fixtures');
}

function readFixture(name: string): FixtureRow[] | null {
    const file = path.join(fixturesDir(), `${name}.json`);
    if (!fs.existsSync(file)) {
        return null;
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    return Array.isArray(parsed) ? (parsed as FixtureRow[]) : null;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length === 0) {
        return {};
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function applyQuery(rows: FixtureRow[], body: Record<string, unknown>): {
    items: FixtureRow[];
    total: number;
} {
    const filter =
        body.filter && typeof body.filter === 'object' && !Array.isArray(body.filter)
            ? (body.filter as Record<string, unknown>)
            : {};
    let items = rows.filter((row) =>
        Object.entries(filter).every(([key, value]) => {
            if (value == null || value === '') {
                return true;
            }
            return String(row[key] ?? '') === String(value);
        }),
    );

    const sort = Array.isArray(body.sort) ? body.sort.map(String) : [];
    for (const key of [...sort].reverse()) {
        const desc = key.startsWith('-');
        const field = desc ? key.slice(1) : key;
        items = [...items].sort((a, b) => {
            const av = String(a[field] ?? '');
            const bv = String(b[field] ?? '');
            const cmp = av.localeCompare(bv);
            return desc ? -cmp : cmp;
        });
    }

    const total = items.length;
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 500);
    const offset = Math.max(Number(body.offset) || 0, 0);
    return { items: items.slice(offset, offset + limit), total };
}

/**
 * Serve a vault query from fixtures. Returns false if this is not a vault
 * POST (caller should continue). Returns true after writing a response
 * (including 404 when the collection fixture is missing).
 */
export async function tryServeVaultFixture(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
): Promise<boolean> {
    const pathname = url.split('?')[0] ?? '';
    const match = pathname.match(QUERY_RE);
    if (!match || (req.method ?? '').toUpperCase() !== 'POST') {
        return false;
    }
    const name = decodeURIComponent(match[1] ?? '');
    const rows = readFixture(name);
    if (!rows) {
        sendJson(res, 404, {
            detail: `No fixture at src/dev/fixtures/${name}.json`,
        });
        return true;
    }
    const body = await readJson(req);
    const { items, total } = applyQuery(rows, body);
    const offset = Math.max(Number(body.offset) || 0, 0);
    sendJson(res, 200, {
        items,
        total,
        has_more: offset + items.length < total,
        next_offset: offset + items.length,
    });
    return true;
}

export function gfVaultFixturesPlugin(): Plugin {
    return {
        name: 'gf-vault-fixtures',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const served = await tryServeVaultFixture(req, res, req.url ?? '');
                if (!served) {
                    next();
                }
            });
            server.config.logger.info(
                '[gf] vault fixtures on — POST …/vault/collections/<name>/query ← src/dev/fixtures/<name>.json',
            );
        },
    };
}
