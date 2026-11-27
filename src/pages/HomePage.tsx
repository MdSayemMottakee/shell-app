import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    Clock,
    Download,
    FolderGit2,
    Grid3X3,
    Layers,
    List,
    Plus,
    Search,
    Star,
} from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CategoryBadge } from '../components/CategoryBadge';
import { CreateRepoModal } from '../components/CreateRepoModal';
import { ExportDialog } from '../components/ExportDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { explainError, listPosts, type Post } from '../lib/blogStore';
import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';
import { cn } from '../lib/cn';

function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTimeMinutes(words: number): number {
    return Math.max(1, Math.round(words / 200));
}

const CATEGORIES = ['All', 'Technical', 'Research', 'Announcement', 'Tutorial'];

export const HomePage: React.FC = () => {
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const analyticsPath = useAppPath('analytics');

    const [posts, setPosts] = useState<Post[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('pub_repo_bookmarks');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;
        listPosts(true)
            .then((items) => {
                if (!cancelled) {
                    setPosts(items);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(explainError(err));
            });
        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    const toggleBookmark = (e: React.MouseEvent, slug: string) => {
        e.preventDefault();
        e.stopPropagation();
        setBookmarkedSlugs((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            try {
                localStorage.setItem('pub_repo_bookmarks', JSON.stringify([...next]));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const handleNewCreated = (newPost: Post) => {
        setPosts((prev) => (prev ? [newPost, ...prev] : [newPost]));
    };

    // Filter logic
    const filteredPosts = useMemo(() => {
        const list = posts ?? [];
        return list.filter((p) => {
            if (favoritesOnly && !bookmarkedSlugs.has(p.slug)) return false;

            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const text = `${p.title} ${p.excerpt} ${p.author} ${p.slug}`.toLowerCase();
                if (!text.includes(q)) return false;
            }

            if (selectedCategory !== 'All') {
                const bodyLower = p.body.toLowerCase();
                const catLower = selectedCategory.toLowerCase();
                if (!bodyLower.includes(`#${catLower}`)) return false;
            }

            return true;
        });
    }, [posts, searchQuery, selectedCategory, favoritesOnly, bookmarkedSlugs]);

    const isLoading = !workspaceId || (posts === null && !error);

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />

            {/* Hero / Banner */}
            <div className="border-b border-border bg-gradient-to-b from-card to-background px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                    <FolderGit2 size={13} /> PubRepo
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">v1.2.0</span>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                                Public Publication & Knowledge Hub
                            </h1>
                            <p className="text-sm text-muted-foreground max-w-2xl">
                                Centralized repository of technical documentation, research papers,
                                and architectural blueprints for this workspace.
                            </p>
                        </div>

                        {/* Top Action buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setExportModalOpen(true)}
                                className="gap-1.5 text-xs"
                            >
                                <Download size={14} /> Export
                            </Button>
                            <Link to={analyticsPath}>
                                <Button variant="secondary" className="gap-1.5 text-xs">
                                    <BarChart3 size={14} /> Analytics
                                </Button>
                            </Link>
                            <Button
                                onClick={() => setCreateModalOpen(true)}
                                className="gap-1.5 text-xs"
                            >
                                <Plus size={14} /> New Publication
                            </Button>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
                        <div className="relative flex-1 min-w-[14rem]">
                            <Search
                                size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                placeholder="Search by title, author, or keyword…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        {/* Category Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                        selectedCategory === cat
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Right tools: Bookmarks toggle & View switcher */}
                        <div className="flex items-center gap-2 border-l border-border pl-3">
                            <button
                                type="button"
                                onClick={() => setFavoritesOnly((prev) => !prev)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                    favoritesOnly
                                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                                        : 'border-border text-muted-foreground hover:bg-muted',
                                )}
                            >
                                <Star
                                    size={13}
                                    className={favoritesOnly ? 'fill-amber-500 text-amber-500' : ''}
                                />
                                Bookmarks ({bookmarkedSlugs.size})
                            </button>

                            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        'rounded p-1 text-muted-foreground transition-colors',
                                        viewMode === 'grid' && 'bg-card text-foreground shadow-sm',
                                    )}
                                    title="Grid view"
                                >
                                    <Grid3X3 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        'rounded p-1 text-muted-foreground transition-colors',
                                        viewMode === 'list' && 'bg-card text-foreground shadow-sm',
                                    )}
                                    title="List view"
                                >
                                    <List size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-6">
                                <div className="mb-3 h-4 w-20 rounded bg-muted" />
                                <div className="h-5 w-3/4 rounded bg-muted" />
                                <div className="mt-2 h-3 w-full rounded bg-muted" />
                                <div className="mt-4 h-3 w-1/2 rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Layers size={24} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-foreground">No publications found</p>
                            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                                {searchQuery || selectedCategory !== 'All' || favoritesOnly
                                    ? 'Try adjusting your search filters, category pills, or bookmark filters.'
                                    : 'Create your first publication to populate this repository catalog.'}
                            </p>
                        </div>
                        <Button onClick={() => setCreateModalOpen(true)} className="mt-2 gap-1.5 text-xs">
                            <Plus size={14} /> Create Publication
                        </Button>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredPosts.map((post) => {
                            const words = wordCount(post.body);
                            const readMins = readingTimeMinutes(words);
                            const isBookmarked = bookmarkedSlugs.has(post.slug);
                            const categoryMatch = post.body.match(/#(\w+)/);
                            const category = categoryMatch ? categoryMatch[1] : 'technical';

                            return (
                                <Link
                                    key={post._id || post.slug}
                                    to={`${base}/posts/${encodeURIComponent(post.slug)}`}
                                    className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
                                >
                                    <div>
                                        {/* Top row */}
                                        <div className="flex items-center justify-between gap-2">
                                            <CategoryBadge category={category || 'technical'} />
                                            <button
                                                type="button"
                                                onClick={(e) => toggleBookmark(e, post.slug)}
                                                className="rounded p-1 text-muted-foreground transition-colors hover:text-amber-500"
                                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark publication'}
                                            >
                                                <Star
                                                    size={16}
                                                    className={cn(isBookmarked && 'fill-amber-400 text-amber-500')}
                                                />
                                            </button>
                                        </div>

                                        {/* Title & Excerpt */}
                                        <h3 className="mt-3 text-base font-bold text-foreground transition-colors group-hover:text-primary">
                                            {post.title}
                                        </h3>
                                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                                            {post.excerpt || 'Technical repository documentation.'}
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-6 border-t border-border pt-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="truncate">{post.author || 'Maintainer'}</span>
                                            <span className="flex items-center gap-1 text-[11px]">
                                                <Clock size={12} /> {readMins}m read
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    /* List View */
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
                        {filteredPosts.map((post) => {
                            const words = wordCount(post.body);
                            const readMins = readingTimeMinutes(words);
                            const isBookmarked = bookmarkedSlugs.has(post.slug);
                            const categoryMatch = post.body.match(/#(\w+)/);
                            const category = categoryMatch ? categoryMatch[1] : 'technical';

                            return (
                                <Link
                                    key={post._id || post.slug}
                                    to={`${base}/posts/${encodeURIComponent(post.slug)}`}
                                    className="group flex items-center justify-between gap-4 p-5 hover:bg-muted/40 transition-colors"
                                >
                                    <div className="flex items-start gap-4 min-w-0">
                                        <button
                                            type="button"
                                            onClick={(e) => toggleBookmark(e, post.slug)}
                                            className="mt-0.5 rounded p-1 text-muted-foreground transition-colors hover:text-amber-500"
                                        >
                                            <Star
                                                size={16}
                                                className={cn(isBookmarked && 'fill-amber-400 text-amber-500')}
                                            />
                                        </button>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <CategoryBadge category={category || 'technical'} />
                                                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                    {post.title}
                                                </h3>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                                                {post.excerpt}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-6 text-xs text-muted-foreground">
                                        <span className="hidden sm:inline">{post.author || 'Maintainer'}</span>
                                        <span className="flex items-center gap-1 text-[11px]">
                                            <Clock size={12} /> {readMins}m
                                        </span>
                                        <ArrowRight
                                            size={16}
                                            className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                                        />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateRepoModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onCreated={handleNewCreated}
            />

            <ExportDialog
                open={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                posts={posts ?? []}
            />
        </div>
    );
};
