import React, { useState } from 'react';
import { Check, Copy, Download, FileJson, FileText, X } from 'lucide-react';
import { type Post } from '../lib/blogStore';
import { Button } from './ui/button';

export interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    posts: Post[];
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, posts }) => {
    const [format, setFormat] = useState<'json' | 'markdown'>('json');
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    const jsonContent = JSON.stringify(
        posts.map((p) => ({
            id: p._id,
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            author: p.author,
            published: p.published,
            created_at: p.created_at,
            updated_at: p.updated_at,
            body: p.body,
        })),
        null,
        2,
    );

    const mdContent = posts
        .map(
            (p) =>
                `# ${p.title}\n\n*Author: ${p.author || 'Anonymous'} | Published: ${p.created_at}*\n\n> ${
                    p.excerpt || ''
                }\n\n${p.body}\n\n---\n`,
        )
        .join('\n');

    const content = format === 'json' ? jsonContent : mdContent;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([content], {
            type: format === 'json' ? 'application/json' : 'text/markdown',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pub-repo-export-${Date.now()}.${format === 'json' ? 'json' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Export Repository Data</h2>
                        <p className="text-xs text-muted-foreground">
                            Export {posts.length} publication records as JSON or Markdown.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setFormat('json')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                            format === 'json'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <FileJson size={14} /> JSON Format
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormat('markdown')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                            format === 'markdown'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <FileText size={14} /> Markdown Bundle
                    </button>
                </div>

                <div className="mt-4">
                    <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
                        {content}
                    </pre>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
                    <Button variant="secondary" onClick={handleCopy} className="gap-1.5">
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button onClick={handleDownload} className="gap-1.5">
                        <Download size={14} /> Download File
                    </Button>
                </div>
            </div>
        </div>
    );
};
