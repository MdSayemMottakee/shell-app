/**
 * Blog data layer on top of the Data Vault collection `blog_posts`.
 *
 * Reads use the shared `queryCollection` helper. Writes use the Vault record
 * routes (POST / PUT / DELETE …/collections/{collection}[/{id}]) with the same
 * Shell bearer token. Post identity inside the app is the `slug`; the Vault
 * document id (`_id`) is only used for update and delete.
 */

import {
    controlPlaneBase,
    formatVaultError,
    queryCollection,
    vaultHeaders,
    workspaceId,
} from './queryVault';
import defaultFixtures from '../dev/fixtures/blog_posts.json';

const STORAGE_KEY = 'pub_repo_local_posts';

function getLocalStore(): Post[] {
    try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved) return JSON.parse(saved) as Post[];
        const initial = (defaultFixtures as Row[]).map(normalize);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        }
        return initial;
    } catch {
        return (defaultFixtures as Row[]).map(normalize);
    }
}

function saveLocalStore(posts: Post[]): void {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        }
    } catch {
        // ignore
    }
}

export const POSTS_COLLECTION = 'blog_posts';

export interface Post {
    _id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    published: boolean;
    author: string;
    created_at: string;
    updated_at: string;
}

export interface PostInput {
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    published: boolean;
    author: string;
}

type Row = Record<string, unknown>;

function text(value: unknown): string {
    return value == null ? '' : String(value);
}

function normalize(row: Row): Post {
    return {
        _id: text(row._id ?? row.id),
        slug: text(row.slug),
        title: text(row.title),
        excerpt: text(row.excerpt),
        body: text(row.body),
        published: row.published === true || row.published === 'true',
        author: text(row.author),
        created_at: text(row.created_at),
        updated_at: text(row.updated_at),
    };
}

/** URL-safe slug from a title. Never empty. */
export function slugify(value: string): string {
    const slug = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');
    return slug || 'post';
}

/** Turns a Vault error into a sentence a reader can act on. */
export function explainError(err: unknown): string {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    if (/collection.*not found/i.test(message)) {
        return `The "${POSTS_COLLECTION}" collection does not exist in this workspace yet. Create it once, then reload this page. (${message})`;
    }
    return message;
}

/** Published posts (or every post when `publishedOnly` is false), newest first. */
export async function listPosts(publishedOnly: boolean): Promise<Post[]> {
    try {
        const page = await queryCollection<Row>(POSTS_COLLECTION, {
            filter: publishedOnly ? { published: true } : {},
            sort: ['-created_at'],
            limit: 200,
            offset: 0,
        });
        if (page && Array.isArray(page.items) && page.items.length > 0) {
            return page.items.map(normalize);
        }
    } catch {
        // Fallback for static deploys (like Vercel)
    }
    const local = getLocalStore();
    return publishedOnly ? local.filter((p) => p.published) : local;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
    try {
        const page = await queryCollection<Row>(POSTS_COLLECTION, {
            filter: { slug },
            limit: 1,
            offset: 0,
        });
        const row = page.items[0];
        if (row) return normalize(row);
    } catch {
        // Fallback
    }
    const local = getLocalStore();
    return local.find((p) => p.slug === slug) ?? null;
}

/** First free slug based on `desired` (`x`, `x-2`, `x-3`, …). `ignoreId` is the post being edited. */
export async function availableSlug(desired: string, ignoreId?: string): Promise<string> {
    for (let n = 1; n < 100; n++) {
        const candidate = n === 1 ? desired : `${desired}-${n}`;
        try {
            const page = await queryCollection<Row>(POSTS_COLLECTION, {
                filter: { slug: candidate },
                limit: 1,
                offset: 0,
            });
            const hit = page.items[0];
            if (!hit || (ignoreId && text(hit._id ?? hit.id) === ignoreId)) {
                return candidate;
            }
        } catch {
            const local = getLocalStore();
            const hit = local.find((p) => p.slug === candidate);
            if (!hit || (ignoreId && hit._id === ignoreId)) {
                return candidate;
            }
        }
    }
    throw new Error('Could not find a free slug for this title. Pick a different slug.');
}

async function postsRequest(
    method: 'POST' | 'PUT' | 'DELETE',
    suffix: string,
    body?: unknown,
): Promise<Row | null> {
    const url = `${controlPlaneBase()}/v1/workspaces/${workspaceId()}/vault/collections/${POSTS_COLLECTION}${suffix}`;
    const res = await fetch(url, {
        method,
        headers: await vaultHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(formatVaultError(res.status, await res.text()));
    }
    if (res.status === 204) {
        return null;
    }
    const json = (await res.json()) as { document?: Row };
    return json.document ?? null;
}

export async function createPost(input: PostInput): Promise<Post> {
    const now = new Date().toISOString();
    const newPost: Post = {
        _id: `post-${Date.now()}`,
        ...input,
        created_at: now,
        updated_at: now,
    };
    try {
        const doc = await postsRequest('POST', '', {
            record: { ...input, created_at: now, updated_at: now },
        });
        if (doc) return normalize(doc);
    } catch {
        // Fallback for static hosting
    }
    const local = getLocalStore();
    saveLocalStore([newPost, ...local]);
    return newPost;
}

export async function updatePost(id: string, input: PostInput, createdAt: string): Promise<void> {
    const now = new Date().toISOString();
    try {
        await postsRequest('PUT', `/${encodeURIComponent(id)}`, {
            record: { ...input, created_at: createdAt, updated_at: now },
        });
        return;
    } catch {
        // Fallback
    }
    const local = getLocalStore();
    const updated = local.map((p) =>
        p._id === id || p.slug === input.slug
            ? { ...p, ...input, created_at: createdAt, updated_at: now }
            : p,
    );
    saveLocalStore(updated);
}

export async function deletePost(id: string): Promise<void> {
    try {
        await postsRequest('DELETE', `/${encodeURIComponent(id)}`);
        return;
    } catch {
        // Fallback
    }
    const local = getLocalStore();
    saveLocalStore(local.filter((p) => p._id !== id));
}
