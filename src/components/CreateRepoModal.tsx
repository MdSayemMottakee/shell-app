import React, { useState } from 'react';
import { Globe, Lock, Plus, Sparkles, X } from 'lucide-react';
import { createPost, slugify, type Post } from '../lib/blogStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

export interface CreateRepoModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: (post: Post) => void;
}

export const CreateRepoModal: React.FC<CreateRepoModalProps> = ({ open, onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [author, setAuthor] = useState('Maintainer');
    const [category, setCategory] = useState('technical');
    const [published, setPublished] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Please provide a publication title.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const slug = slugify(title);
            const initialBody = `# ${title}\n\n*Category: #${category}*\n\n${
                excerpt || 'Initial publication documentation draft.'
            }\n\n## Overview\n\nWelcome to this publication. Detailed documentation and benchmarks will be published here.\n\n### Key Features\n\n- Robust modular architecture\n- Full documentation\n- Automated test coverage\n`;

            const newPost = await createPost({
                title: title.trim(),
                slug,
                excerpt: excerpt.trim() || `Technical publication covering ${title.trim()}`,
                body: initialBody,
                author: author.trim() || 'Maintainer',
                published,
            });

            onCreated(newPost);
            onClose();
            setTitle('');
            setExcerpt('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create publication.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">New Publication Entry</h2>
                            <p className="text-xs text-muted-foreground">
                                Publish a new repository article or technical note.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-foreground">Publication Title</label>
                        <Input
                            placeholder="e.g. Distributed Consensus Engine Architecture"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground">Short Summary / Abstract</label>
                        <Textarea
                            placeholder="Briefly describe what this publication covers..."
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            rows={2}
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-foreground">Primary Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="technical">Technical</option>
                                <option value="research">Research</option>
                                <option value="announcement">Announcement</option>
                                <option value="tutorial">Tutorial</option>
                                <option value="guide">Guide</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground">Author</label>
                            <Input
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <label className="flex cursor-pointer items-center justify-between">
                            <div className="flex items-center gap-2">
                                {published ? (
                                    <Globe size={16} className="text-emerald-600" />
                                ) : (
                                    <Lock size={16} className="text-muted-foreground" />
                                )}
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {published ? 'Directly Publish to Catalog' : 'Save as Workspace Draft'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {published
                                            ? 'Visible to all catalog readers'
                                            : 'Only visible to workspace editors'}
                                    </p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={published}
                                onChange={(e) => setPublished(e.target.checked)}
                                className="h-4 w-4 rounded accent-primary"
                            />
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="gap-1.5">
                            <Plus size={14} />
                            {loading ? 'Creating…' : 'Create Publication'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
