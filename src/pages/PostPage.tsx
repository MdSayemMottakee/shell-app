import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { explainError, getPostBySlug, type Post } from '../lib/blogStore';
import { formatDate } from '../lib/format';
import { renderMarkdown, PROSE_CLASSES } from '../lib/markdown';
import { setBreadcrumbLabel } from '../lib/shellBridge';
import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';

export const PostPage: React.FC = () => {
    const { slug = '' } = useParams();
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const homePath = useAppPath('home');
    const [post, setPost] = useState<Post | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!workspaceId) {
            return;
        }
        let cancelled = false;
        setStatus('loading');
        getPostBySlug(slug)
            .then((found) => {
                if (cancelled) {
                    return;
                }
                setPost(found);
                setStatus(found ? 'ready' : 'missing');
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(explainError(err));
                    setStatus('error');
                }
            });
        return () => {
            cancelled = true;
        };
    }, [workspaceId, slug]);

    useEffect(() => {
        if (post) {
            setBreadcrumbLabel(post.title);
        }
    }, [post]);

    const html = useMemo(() => (post ? renderMarkdown(post.body) : ''), [post]);

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />
            <div className="mx-auto w-full max-w-3xl flex-1 p-6">
                <Card>
                    {status === 'loading' ? (
                        <p className="px-6 py-16 text-center text-sm text-muted-foreground">Loading post…</p>
                    ) : null}
                    {status === 'missing' ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <p className="text-sm text-muted-foreground">Post not found.</p>
                            <Link to={homePath}>
                                <Button variant="secondary">Back to blog</Button>
                            </Link>
                        </div>
                    ) : null}
                    {status === 'error' ? (
                        <p className="px-6 py-16 text-center text-sm text-muted-foreground">{error}</p>
                    ) : null}
                    {status === 'ready' && post ? (
                        <article>
                            <header className="border-b border-border px-6 py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <Link to={homePath} className="text-sm text-muted-foreground">
                                        ← All posts
                                    </Link>
                                    <Link to={`${base}/posts/${encodeURIComponent(post.slug)}/edit`}>
                                        <Button variant="secondary">Edit</Button>
                                    </Link>
                                </div>
                                <p className="mt-4 text-xs text-muted-foreground">
                                    {formatDate(post.created_at)}
                                    {post.author ? ` · ${post.author}` : ''}
                                    {!post.published ? ' · Draft' : ''}
                                </p>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                                    {post.title}
                                </h1>
                                {post.excerpt ? (
                                    <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                                ) : null}
                            </header>
                            <div
                                className={`px-6 py-6 text-sm leading-relaxed text-foreground ${PROSE_CLASSES}`}
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </article>
                    ) : null}
                </Card>
            </div>
        </div>
    );
};
