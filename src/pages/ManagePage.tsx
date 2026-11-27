import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, FileText, Plus, Trash2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { DataGrid, type DataGridColumn } from '../components/DataGrid';
import { StatusPill } from '../components/StatusPill';
import { Button } from '../components/ui/button';
import { deletePost, explainError, listPosts, type Post } from '../lib/blogStore';
import { formatDate } from '../lib/format';
import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';

export const ManagePage: React.FC = () => {
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const newPath = useAppPath('posts/new');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;
        setLoading(true);
        listPosts(false)
            .then((items) => { if (!cancelled) { setPosts(items); setError(null); } })
            .catch((err: unknown) => { if (!cancelled) { setPosts([]); setError(explainError(err)); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [workspaceId]);

    const remove = useCallback(async (post: Post) => {
        if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
        try {
            await deletePost(post._id);
            setPosts((prev) => prev.filter((p) => p._id !== post._id));
            setError(null);
        } catch (err) {
            setError(explainError(err));
        }
    }, []);

    const stats = useMemo(() => ({
        total: posts.length,
        published: posts.filter((p) => p.published).length,
        drafts: posts.filter((p) => !p.published).length,
    }), [posts]);

    const columns = useMemo<DataGridColumn<Post>[]>(
        () => [
            {
                id: 'title',
                header: 'Title',
                render: (row) => (
                    <div className="min-w-0">
                        <Link
                            to={`${base}/posts/${encodeURIComponent(row.slug)}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                            {row.title}
                        </Link>
                        {row.excerpt && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-xs">{row.excerpt}</p>
                        )}
                    </div>
                ),
            },
            {
                id: 'author',
                header: 'Author',
                accessor: (row) => row.author,
                render: (row) => (
                    <span className="text-sm text-muted-foreground">{row.author || '—'}</span>
                ),
            },
            {
                id: 'status',
                header: 'Status',
                accessor: (row) => (row.published ? 'Published' : 'Draft'),
                render: (row) => (
                    <StatusPill tone={row.published ? 'done' : 'neutral'}>
                        {row.published ? 'Published' : 'Draft'}
                    </StatusPill>
                ),
            },
            {
                id: 'updated_at',
                header: 'Updated',
                accessor: (row) => formatDate(row.updated_at),
                render: (row) => (
                    <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.updated_at)}</span>
                ),
            },
            {
                id: 'actions',
                header: '',
                filterable: false,
                accessor: () => '',
                render: (row) => (
                    <div className="flex items-center justify-end gap-1">
                        <Link to={`${base}/posts/${encodeURIComponent(row.slug)}/edit`}>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Edit3 size={12} /> Edit
                            </button>
                        </Link>
                        <button
                            type="button"
                            onClick={() => void remove(row)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ),
            },
        ],
        [base, remove],
    );

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return posts;
        return posts.filter((p) => `${p.title} ${p.slug} ${p.excerpt} ${p.author}`.toLowerCase().includes(q));
    }, [posts, search]);

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />

            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">

                {/* Page header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <FileText size={16} className="text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Content</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage posts</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {!workspaceId ? 'Connecting…' : error ? error : loading ? 'Loading…' : 'All posts in this workspace'}
                        </p>
                    </div>
                    <Link to={newPath}>
                        <Button className="gap-1.5">
                            <Plus size={14} /> New post
                        </Button>
                    </Link>
                </div>

                {/* Quick stat strip */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total', value: stats.total },
                        { label: 'Published', value: stats.published },
                        { label: 'Drafts', value: stats.drafts },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-border bg-card px-4 py-3 text-center shadow-sm">
                            <p className="text-xl font-bold tabular-nums text-foreground">{loading ? '…' : value}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Data grid */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        total={rows.length}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        search={search}
                        onSearchChange={(v) => { setSearch(v); setPage(1); }}
                        searchPlaceholder="Search posts…"
                        emptyTitle={loading ? 'Loading…' : error ? 'Could not load posts' : 'No posts yet'}
                        emptyDescription={error ?? 'Create your first post to get started.'}
                    />
                </div>
            </div>
        </div>
    );
};
