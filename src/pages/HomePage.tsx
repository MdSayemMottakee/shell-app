import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, PenLine, Plus } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/ui/button';
import { explainError, listPosts, type Post } from '../lib/blogStore';
import { formatDate } from '../lib/format';
import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';
import { cn } from '../lib/cn';

export const HomePage: React.FC = () => {
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const newPath = useAppPath('posts/new');
    const managePath = useAppPath('manage');
    const [posts, setPosts] = useState<Post[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;
        listPosts(true)
            .then((items) => { if (!cancelled) { setPosts(items); setError(null); } })
            .catch((err: unknown) => { if (!cancelled) setError(explainError(err)); });
        return () => { cancelled = true; };
    }, [workspaceId]);

    const isLoading = !workspaceId || posts === null && !error;

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />

            <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">

                {/* Hero header */}
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <BookOpen size={18} className="text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Blog</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Latest posts</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {error ? error : isLoading ? 'Loading…' : `${posts?.length ?? 0} published`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={managePath}>
                            <Button variant="secondary" className="gap-1.5">
                                <PenLine size={14} /> Manage
                            </Button>
                        </Link>
                        <Link to={newPath}>
                            <Button className="gap-1.5">
                                <Plus size={14} /> New post
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Post list */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-6">
                                <div className="mb-3 h-3 w-24 rounded bg-muted" />
                                <div className="h-5 w-2/3 rounded bg-muted" />
                                <div className="mt-2 h-3 w-full rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                ) : posts && posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <PenLine size={24} className="text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">No published posts yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">Create your first post and publish it to see it here.</p>
                        </div>
                        <Link to={newPath}>
                            <Button className="gap-1.5 text-xs">
                                <Plus size={13} /> Write first post
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(posts ?? []).map((post, idx) => (
                            <Link
                                key={post._id || post.slug}
                                to={`${base}/posts/${encodeURIComponent(post.slug)}`}
                                className={cn(
                                    'group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all',
                                    'hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5',
                                )}
                            >
                                {idx === 0 && (
                                    <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                        Latest
                                    </span>
                                )}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                                            {post.title}
                                        </h2>
                                        {post.excerpt && (
                                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                        )}
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span>{formatDate(post.created_at)}</span>
                                            {post.author && (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-border" />
                                                    <span>{post.author}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ArrowRight
                                        size={18}
                                        className="mt-0.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary"
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
