import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Award,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    PieChart,
    Sparkles,
    Users,
} from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CategoryBadge } from '../components/CategoryBadge';
import { MetricCard } from '../components/MetricCard';
import { StatusPill } from '../components/StatusPill';
import { Button } from '../components/ui/button';
import { explainError, listPosts, type Post } from '../lib/blogStore';
import { formatDate } from '../lib/format';
import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';

function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTimeMinutes(words: number): number {
    return Math.max(1, Math.round(words / 200));
}

export const AnalyticsPage: React.FC = () => {
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const homePath = useAppPath('home');
    const managePath = useAppPath('manage');

    const [posts, setPosts] = useState<Post[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;
        setLoading(true);
        listPosts(false)
            .then((items) => {
                if (!cancelled) {
                    setPosts(items);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(explainError(err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    const stats = useMemo(() => {
        const list = posts ?? [];
        const total = list.length;
        const published = list.filter((p) => p.published).length;
        const drafts = total - published;

        const totalWords = list.reduce((sum, p) => sum + wordCount(p.body), 0);
        const avgWords = total ? Math.round(totalWords / total) : 0;
        const totalReadMinutes = Math.round(totalWords / 200);

        const authors = [...new Set(list.map((p) => p.author || 'Maintainer'))];

        // Distribution by reading depth
        const depth = {
            quick: list.filter((p) => wordCount(p.body) < 150).length,
            medium: list.filter((p) => {
                const w = wordCount(p.body);
                return w >= 150 && w < 500;
            }).length,
            deep: list.filter((p) => wordCount(p.body) >= 500).length,
        };

        // Category frequencies
        const categoryCounts: Record<string, number> = {};
        list.forEach((p) => {
            const match = p.body.match(/#(\w+)/);
            const cat = match && match[1] ? match[1].toLowerCase() : 'technical';
            categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
        });

        return {
            total,
            published,
            drafts,
            totalWords,
            avgWords,
            totalReadMinutes,
            authors,
            depth,
            categoryCounts,
        };
    }, [posts]);

    const topPublications = useMemo(() => {
        return [...(posts ?? [])]
            .map((p) => {
                const words = wordCount(p.body);
                return {
                    post: p,
                    words,
                    readMins: readingTimeMinutes(words),
                    freshnessScore: Math.max(
                        0,
                        Math.round(
                            100 -
                                (Date.now() - new Date(p.updated_at).getTime()) /
                                    (1000 * 60 * 60 * 24),
                        ),
                    ),
                };
            })
            .sort((a, b) => b.words - a.words)
            .slice(0, 5);
    }, [posts]);

    const handleDownloadReport = () => {
        const report = {
            workspaceId,
            generatedAt: new Date().toISOString(),
            metrics: stats,
            publications: (posts ?? []).map((p) => ({
                title: p.title,
                slug: p.slug,
                published: p.published,
                words: wordCount(p.body),
                updated: p.updated_at,
            })),
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pub-repo-analytics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />

            <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <Sparkles size={12} /> Analytics Engine
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Repository Analytics & Performance
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Deep metrics, publication velocity, and reader engagement insights.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleDownloadReport}
                            className="gap-1.5"
                        >
                            <Download size={14} /> Export Report
                        </Button>
                        <Link to={managePath}>
                            <Button className="gap-1.5">
                                <FileText size={14} /> Manage Library
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <MetricCard
                        title="Repository Items"
                        value={stats.total}
                        change="+100%"
                        trend="up"
                        subtext={`${stats.published} live in catalog`}
                        icon={BookOpen}
                        accentColor="text-primary"
                    />
                    <MetricCard
                        title="Total Words"
                        value={stats.totalWords.toLocaleString()}
                        change="Growing"
                        trend="up"
                        subtext={`~${stats.avgWords} words/article`}
                        icon={FileText}
                        accentColor="text-violet-600"
                    />
                    <MetricCard
                        title="Total Reading Time"
                        value={`${stats.totalReadMinutes}m`}
                        change="Comprehensive"
                        trend="neutral"
                        subtext="Based on standard 200 WPM"
                        icon={Clock}
                        accentColor="text-emerald-600"
                    />
                    <MetricCard
                        title="Active Authors"
                        value={stats.authors.length}
                        subtext="Workspace contributors"
                        icon={Users}
                        accentColor="text-amber-600"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left 2 Cols: Publication Depth & Ranking */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Reading Depth Breakdown */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={18} className="text-primary" />
                                    <h2 className="text-base font-bold text-foreground">
                                        Content Depth Distribution
                                    </h2>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    Length categorization
                                </span>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-4">
                                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                        Quick Notes
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-foreground">
                                        {stats.depth.quick}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">&lt; 150 words</p>
                                </div>
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                                    <p className="text-xs font-semibold text-primary uppercase">
                                        Standard Guides
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-foreground">
                                        {stats.depth.medium}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">150–500 words</p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                        Deep Dives
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-foreground">
                                        {stats.depth.deep}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">500+ words</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Publications Table */}
                        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <Award size={18} className="text-primary" />
                                    <h2 className="text-base font-bold text-foreground">
                                        Top Publications by Content Depth
                                    </h2>
                                </div>
                                <Link
                                    to={homePath}
                                    className="text-xs font-semibold text-primary hover:underline"
                                >
                                    Browse All
                                </Link>
                            </div>

                            {loading ? (
                                <div className="py-16 text-center text-sm text-muted-foreground">
                                    Loading analytics…
                                </div>
                            ) : topPublications.length === 0 ? (
                                <div className="py-16 text-center text-sm text-muted-foreground">
                                    No publications found yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {topPublications.map(({ post, words, readMins }, idx) => (
                                        <div
                                            key={post._id}
                                            className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">
                                                    #{idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <Link
                                                        to={`${base}/posts/${encodeURIComponent(post.slug)}`}
                                                        className="block truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
                                                    >
                                                        {post.title}
                                                    </Link>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {post.author || 'Maintainer'} · {formatDate(post.created_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-4 text-xs">
                                                <div className="text-right">
                                                    <p className="font-semibold text-foreground">
                                                        {words} words
                                                    </p>
                                                    <p className="text-muted-foreground">~{readMins}m read</p>
                                                </div>
                                                <StatusPill tone={post.published ? 'done' : 'neutral'}>
                                                    {post.published ? 'Live' : 'Draft'}
                                                </StatusPill>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Category Distribution & Readiness */}
                    <div className="space-y-6">
                        {/* Categories Cloud */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 border-b border-border pb-4">
                                <PieChart size={18} className="text-primary" />
                                <h2 className="text-base font-bold text-foreground">Categories & Tags</h2>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {Object.entries(stats.categoryCounts).map(([cat, count]) => (
                                    <div
                                        key={cat}
                                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs"
                                    >
                                        <CategoryBadge category={cat} />
                                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Health Card */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground">Catalog Quality Score</h3>
                            </div>
                            <div className="mt-4 flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold text-foreground">
                                    {stats.total === 0
                                        ? 100
                                        : Math.round((stats.published / stats.total) * 100)}
                                    %
                                </span>
                                <span className="text-xs text-muted-foreground">publication rate</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                High ratio of ready-to-read articles available in the public catalog
                                repository.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
