import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import {
    availableSlug,
    createPost,
    explainError,
    getPostBySlug,
    slugify,
    updatePost,
    type Post,
    type PostInput,
} from '../lib/blogStore';
import { renderMarkdown, PROSE_CLASSES } from '../lib/markdown';
import { useHostWorkspaceId } from '../lib/queryVault';
import { useAppBasePath, useAppPath } from '../lib/useAppPath';

export const PostEditorPage: React.FC = () => {
    const { slug: routeSlug } = useParams();
    const isNew = !routeSlug;
    const navigate = useNavigate();
    const workspaceId = useHostWorkspaceId();
    const base = useAppBasePath();
    const managePath = useAppPath('manage');

    const [existing, setExisting] = useState<Post | null>(null);
    const [loading, setLoading] = useState(!isNew);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [slugField, setSlugField] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [excerpt, setExcerpt] = useState('');
    const [body, setBody] = useState('');
    const [author, setAuthor] = useState('');
    const [published, setPublished] = useState(false);

    const [preview, setPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (isNew || !workspaceId) {
            return;
        }
        let cancelled = false;
        setLoading(true);
        getPostBySlug(routeSlug ?? '')
            .then((found) => {
                if (cancelled) {
                    return;
                }
                if (!found) {
                    setLoadError('Post not found.');
                    return;
                }
                setExisting(found);
                setTitle(found.title);
                setSlugField(found.slug);
                setSlugTouched(true);
                setExcerpt(found.excerpt);
                setBody(found.body);
                setAuthor(found.author);
                setPublished(found.published);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setLoadError(explainError(err));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [isNew, routeSlug, workspaceId]);

    const effectiveSlug = slugTouched ? slugField : slugify(title);
    const html = useMemo(() => renderMarkdown(body), [body]);

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!title.trim()) {
            setSaveError('Title is required.');
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            const desired = slugify(effectiveSlug || title);
            const input: PostInput = {
                slug: '',
                title: title.trim(),
                excerpt: excerpt.trim(),
                body,
                published,
                author: author.trim(),
            };
            if (existing) {
                const finalSlug = await availableSlug(desired, existing._id);
                await updatePost(existing._id, { ...input, slug: finalSlug }, existing.created_at);
                navigate(`${base}/posts/${encodeURIComponent(finalSlug)}`);
            } else {
                const finalSlug = await availableSlug(desired);
                const created = await createPost({ ...input, slug: finalSlug });
                navigate(`${base}/posts/${encodeURIComponent(created.slug || finalSlug)}`);
            }
        } catch (err) {
            setSaveError(explainError(err));
        } finally {
            setSaving(false);
        }
    };

    const cancelPath = existing ? `${base}/posts/${encodeURIComponent(existing.slug)}` : managePath;

    return (
        <div className="flex min-h-full flex-col bg-background">
            <AppHeader />
            <div className="mx-auto w-full max-w-4xl flex-1 p-6">
                <Card>
                    <PageHeader
                        title={isNew ? 'New post' : 'Edit post'}
                        description={
                            !workspaceId
                                ? 'Connecting to the workspace…'
                                : loading
                                  ? 'Loading post…'
                                  : loadError
                                    ? loadError
                                    : 'Write in Markdown. Save as draft or publish.'
                        }
                        actions={
                            <Link to={cancelPath}>
                                <Button variant="secondary">Cancel</Button>
                            </Link>
                        }
                    />
                    {!loading && !loadError ? (
                        <form className="grid gap-4 px-6 py-5" onSubmit={handleSave}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-xs text-muted-foreground">
                                    Title
                                    <Input
                                        className="mt-1"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </label>
                                <label className="block text-xs text-muted-foreground">
                                    Slug (URL)
                                    <Input
                                        className="mt-1 font-mono"
                                        value={slugTouched ? slugField : effectiveSlug}
                                        onChange={(e) => {
                                            setSlugField(e.target.value);
                                            setSlugTouched(true);
                                        }}
                                    />
                                </label>
                            </div>
                            <label className="block text-xs text-muted-foreground">
                                Excerpt
                                <Input
                                    className="mt-1"
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="One line shown on the blog list"
                                />
                            </label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-xs text-muted-foreground">
                                    Author
                                    <Input
                                        className="mt-1"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                    />
                                </label>
                                <label className="block text-xs text-muted-foreground">
                                    Status
                                    <Select
                                        className="mt-1"
                                        value={published ? 'published' : 'draft'}
                                        onChange={(e) => setPublished(e.target.value === 'published')}
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </Select>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Body (Markdown)</span>
                                <Button variant="ghost" onClick={() => setPreview((p) => !p)}>
                                    {preview ? 'Edit' : 'Preview'}
                                </Button>
                            </div>
                            {preview ? (
                                <div
                                    className={`min-h-[16rem] rounded border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground ${PROSE_CLASSES}`}
                                    dangerouslySetInnerHTML={{ __html: html || '<p>Nothing to preview yet.</p>' }}
                                />
                            ) : (
                                <Textarea
                                    className="min-h-[16rem] font-mono text-[13px]"
                                    rows={16}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder={'# Heading\n\nWrite your post here. **Bold**, *italic*, [links](https://example.com), `code`, lists, > quotes.'}
                                />
                            )}
                            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
                            <div className="flex items-center gap-2 pt-1">
                                <Button type="submit" disabled={saving || !workspaceId}>
                                    {saving ? 'Saving…' : published ? 'Save and publish' : 'Save draft'}
                                </Button>
                            </div>
                        </form>
                    ) : null}
                </Card>
            </div>
        </div>
    );
};
