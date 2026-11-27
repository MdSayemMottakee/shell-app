import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Clock,
    Edit3,
    FileText,
    TrendingUp,
    Users,
    XCircle,
    Zap,
} from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { StatusPill } from '../components/StatusPill';
import { explainError, listPosts, type Post } from '../lib/blogStore';

import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';
import { cn } from '../lib/cn';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function wordCount(body: string): number {
    return body.trim().split(/\s+/).filter(Boolean).length;
}

type Health = 'good' | 'warn' | 'error';

interface PostAudit {
    post: Post;
    health: Health;
    issues: string[];
    words: number;
}

function auditPost(post: Post): PostAudit {
    const issues: string[] = [];
    if (!post.excerpt || post.excerpt.trim().length < 10) issues.push('Missing or too-short excerpt');
    if (!post.author || post.author.trim() === '') issues.push('No author set');
    const words = wordCount(post.body);
    if (words < 50) issues.push('Body is very short (< 50 words)');
    if (post.title.length > 80) issues.push('Title is too long (> 80 chars)');
    if (post.slug !== post.slug.toLowerCase()) issues.push('Slug contains uppercase characters');
    const health: Health = issues.length === 0 ? 'good' : issues.length <= 1 ? 'warn' : 'error';
    return { post, health, issues, words };
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub, accent = 'text-primary' }) => (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={cn('mt-2 text-3xl font-bold tabular-nums', accent)}>{value}</p>
                {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={cn('rounded-lg border border-border bg-muted p-2', accent)}>
                <Icon size={18} />
            </div>
        </div>
    </div>
);

const HealthBadge: React.FC<{ health: Health }> = ({ health }) => {
    if (health === 'good') return <StatusPill tone="done">Healthy</StatusPill>;
    if (health === 'warn') return <StatusPill tone="warn">Warning</StatusPill>;
    return <StatusPill tone="error">Issues</StatusPill>;
};

const HealthIcon: React.FC<{ health: Health }> = ({ health }) => {
    if (health === 'good') return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (health === 'warn') return <AlertTriangle size={16} className="text-amber-500" />;
    return <XCircle size={16} className="text-red-500" />;
};

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export const AuditPage: React.FC = () => {
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const homePath = useAppPath('home');
    const managePath = useAppPath('manage');

    const [posts, setPosts] = useState<Post[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | Health>('all');

    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;
        setLoading(true);
        listPosts(false)
            .then((items) => {
                if (!cancelled) { setPosts(items); setError(null); }
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(explainError(err));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [workspaceId]);

    const audits = useMemo<PostAudit[]>(() => (posts ?? []).map(auditPost), [posts]);

    const stats = useMemo(() => {
        const total = audits.length;
        const published = audits.filter((a) => a.post.published).length;
        const drafts = total - published;
        const healthy = audits.filter((a) => a.health === 'good').length;
        const withIssues = audits.filter((a) => a.health !== 'good').length;
        const totalWords = audits.reduce((s, a) => s + a.words, 0);
        const avgWords = total ? Math.round(totalWords / total) : 0;
        const authors = [...new Set(audits.map((a) => a.post.author).filter(Boolean))];
        return { total, published, drafts, healthy, withIssues, totalWords, avgWords, authors };
    }, [audits]);

    // Activity timeline: last 7 events by updated_at
    const timeline = useMemo(
        () =>
            [...(posts ?? [])]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 8),
        [posts],
    );

    // Weekly publishing distribution (last 4 weeks)
    const weeklyData = useMemo(() => {
        const weeks = [0, 0, 0, 0];
        const now = Date.now();
        (posts ?? []).forEach((p) => {
            if (!p.published) return;
            const daysAgo = (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const bucket = Math.min(3, Math.floor(daysAgo / 7));
            weeks[bucket] = (weeks[bucket] ?? 0) + 1;
        });
        return weeks.map((count, i) => ({
            label: i === 0 ? 'This week' : `${i}w ago`,
            count,
            max: Math.max(...weeks, 1),
        }));
    }, [posts]);

    const filteredAudits = useMemo(
        () => (activeFilter === 'all' ? audits : audits.filter((a) => a.health === activeFilter)),
        [audits, activeFilter],
    );

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />

            {/* Top breadcrumb bar */}
            <div className="border-b border-border bg-card px-6 py-2">
                <nav className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Link to={homePath} className="hover:text-foreground transition-colors">Blog</Link>
                    <ChevronRight size={12} />
                    <Link to={managePath} className="hover:text-foreground transition-colors">Manage</Link>
                    <ChevronRight size={12} />
                    <span className="font-medium text-foreground">Audit</span>
                </nav>
            </div>

            <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6">

                {/* Page title */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Audit</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {loading
                                ? 'Analysing posts…'
                                : error
                                ? error
                                : `${stats.total} posts · ${stats.withIssues} with issues · last updated just now`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                            <Zap size={11} />
                            Live analysis
                        </span>
                    </div>
                </div>

                {/* ── Stat cards ──────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard icon={FileText} label="Total posts" value={stats.total} sub={`${stats.published} published`} />
                    <StatCard icon={BookOpen} label="Published" value={stats.published} sub={`${stats.drafts} drafts`} accent="text-emerald-600" />
                    <StatCard icon={CheckCircle2} label="Healthy" value={stats.healthy} sub={`${stats.withIssues} with issues`} accent="text-sky-600" />
                    <StatCard icon={TrendingUp} label="Avg. words" value={stats.avgWords} sub={`${stats.totalWords} total`} accent="text-violet-600" />
                </div>

                {/* ── Main grid ──────────────────────────────────────────── */}
                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Post health table — takes 2/3 */}
                    <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-primary" />
                                <h2 className="text-sm font-semibold text-foreground">Post Health</h2>
                            </div>
                            <div className="flex gap-1">
                                {(['all', 'good', 'warn', 'error'] as const).map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setActiveFilter(f)}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                            activeFilter === f
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        {f === 'all' ? 'All' : f === 'good' ? 'Healthy' : f === 'warn' ? 'Warn' : 'Issues'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                                Loading posts…
                            </div>
                        ) : filteredAudits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                                <CheckCircle2 size={32} className="text-emerald-400" />
                                <p className="text-sm font-medium text-foreground">All clear!</p>
                                <p className="text-xs text-muted-foreground">No posts match this filter.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filteredAudits.map(({ post, health, issues, words }) => (
                                    <div key={post._id} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors">
                                        <div className="mt-0.5 shrink-0">
                                            <HealthIcon health={health} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    to={`${base}/posts/${encodeURIComponent(post.slug)}`}
                                                    className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
                                                >
                                                    {post.title}
                                                </Link>
                                                <HealthBadge health={health} />
                                                <StatusPill tone={post.published ? 'done' : 'neutral'}>
                                                    {post.published ? 'Published' : 'Draft'}
                                                </StatusPill>
                                            </div>
                                            {issues.length > 0 && (
                                                <ul className="mt-1.5 space-y-0.5">
                                                    {issues.map((issue) => (
                                                        <li key={issue} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                                                            {issue}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {words} words · {post.author || '—'} · updated {relativeTime(post.updated_at)}
                                            </p>
                                        </div>
                                        <Link
                                            to={`${base}/posts/${encodeURIComponent(post.slug)}/edit`}
                                            className="shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                                        >
                                            <span className="flex items-center gap-1"><Edit3 size={11} /> Edit</span>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-6">

                        {/* Authors */}
                        <div className="rounded-xl border border-border bg-card shadow-sm">
                            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                                <Users size={16} className="text-primary" />
                                <h2 className="text-sm font-semibold text-foreground">Authors</h2>
                            </div>
                            <div className="divide-y divide-border">
                                {stats.authors.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-muted-foreground">No authors yet.</p>
                                ) : (
                                    stats.authors.map((author) => {
                                        const count = audits.filter((a) => a.post.author === author).length;
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                        const pct = Math.round((count / (stats.total || 1)) * 100);
                                        return (
                                            <div key={author} className="flex items-center gap-3 px-5 py-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                    {author.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">{author}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-primary transition-all"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Publishing activity (last 4 weeks) */}
                        <div className="rounded-xl border border-border bg-card shadow-sm">
                            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                                <TrendingUp size={16} className="text-primary" />
                                <h2 className="text-sm font-semibold text-foreground">Publishing Activity</h2>
                            </div>
                            <div className="space-y-3 px-5 py-4">
                                {weeklyData.map(({ label, count, max }) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary/70 transition-all"
                                                style={{ width: `${(count / max) * 100}%` }}
                                            />
                                        </div>
                                        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick score card */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Content Score</p>
                            <div className="mt-3 flex items-end gap-2">
                                <span className="text-4xl font-bold text-foreground">
                                    {stats.total === 0 ? '—' : Math.round((stats.healthy / stats.total) * 100)}
                                    {stats.total > 0 && <span className="text-xl font-normal text-muted-foreground">%</span>}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.healthy} of {stats.total} posts are issue-free
                            </p>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all',
                                        stats.total === 0
                                            ? 'w-0'
                                            : (stats.healthy / stats.total) >= 0.8
                                            ? 'bg-emerald-500'
                                            : (stats.healthy / stats.total) >= 0.5
                                            ? 'bg-amber-500'
                                            : 'bg-red-500',
                                    )}
                                    style={{ width: stats.total === 0 ? '0%' : `${(stats.healthy / stats.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Activity timeline ──────────────────────────────────── */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                        <Clock size={16} className="text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                    </div>
                    {timeline.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No activity yet.</p>
                    ) : (
                        <div className="relative px-5 py-4">
                            {/* Timeline line */}
                            <div className="absolute left-[2.125rem] top-4 bottom-4 w-px bg-border" />
                            <ol className="space-y-6">
                                {timeline.map((post) => (
                                    <li key={post._id} className="flex items-start gap-4">
                                        <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card">
                                            {post.published
                                                ? <CheckCircle2 size={13} className="text-emerald-500" />
                                                : <Edit3 size={13} className="text-muted-foreground" />}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 pt-0.5">
                                            <Link
                                                to={`${base}/posts/${encodeURIComponent(post.slug)}`}
                                                className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
                                            >
                                                {post.title}
                                            </Link>
                                            <StatusPill tone={post.published ? 'done' : 'neutral'}>
                                                {post.published ? 'Published' : 'Draft'}
                                            </StatusPill>
                                        </div>
                                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                            {relativeTime(post.updated_at)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
