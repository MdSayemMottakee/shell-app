/**
 * Minimal Markdown → HTML for post bodies.
 *
 * Safety: every piece of text is HTML-escaped before any markup is added, so
 * raw HTML typed into a post is shown as plain text. Links and images only
 * accept http(s), site-relative, and mailto URLs, so `javascript:` URLs are
 * never emitted.
 *
 * Supported: headings, paragraphs, **bold**, *italic*, ~~strike~~, `code`,
 * fenced code blocks, ordered and unordered lists, > blockquotes, ---
 * rules, [links](url) and ![images](url).
 */

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const IMAGE_RE = /!\[([^\]\n]*)\]\(((?:https?:\/\/|\/(?!\/))[^\s)]*)\)/g;
const LINK_RE = /\[([^\]\n]+)\]\(((?:https?:\/\/|\/(?!\/)|mailto:)[^\s)]*)\)/g;

const FENCE_RE = /^\s*```/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const RULE_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE_RE = /^>\s?/;
const UL_RE = /^\s*[-*+]\s+(.*)$/;
const OL_RE = /^\s*\d+\.\s+(.*)$/;

function renderInline(raw: string): string {
    const codeSpans: string[] = [];
    let s = escapeHtml(raw).replace(/`([^`\n]+)`/g, (_match, code: string) => {
        codeSpans.push(`<code>${code}</code>`);
        return `\u0000${codeSpans.length - 1}\u0000`;
    });

    s = s
        .replace(IMAGE_RE, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(LINK_RE, '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    return s.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codeSpans[Number(index)] ?? '');
}

function startsBlock(line: string): boolean {
    return (
        FENCE_RE.test(line) ||
        HEADING_RE.test(line) ||
        RULE_RE.test(line) ||
        QUOTE_RE.test(line) ||
        UL_RE.test(line) ||
        OL_RE.test(line)
    );
}

export function renderMarkdown(source: string): string {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const at = (n: number): string => lines[n] ?? '';
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = at(i);

        if (line.trim() === '') {
            i++;
            continue;
        }

        if (FENCE_RE.test(line)) {
            const buf: string[] = [];
            i++;
            while (i < lines.length && !FENCE_RE.test(at(i))) {
                buf.push(at(i));
                i++;
            }
            i++; // skip the closing fence (or end of input)
            out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
            continue;
        }

        const heading = HEADING_RE.exec(line);
        if (heading) {
            const level = (heading[1] ?? '#').length;
            out.push(`<h${level}>${renderInline((heading[2] ?? '').trim())}</h${level}>`);
            i++;
            continue;
        }

        if (RULE_RE.test(line)) {
            out.push('<hr />');
            i++;
            continue;
        }

        if (QUOTE_RE.test(line)) {
            const buf: string[] = [];
            while (i < lines.length && QUOTE_RE.test(at(i))) {
                buf.push(at(i).replace(QUOTE_RE, ''));
                i++;
            }
            out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
            continue;
        }

        if (UL_RE.test(line) || OL_RE.test(line)) {
            const ordered = OL_RE.test(line);
            const itemRe = ordered ? OL_RE : UL_RE;
            const items: string[] = [];
            while (i < lines.length) {
                const match = itemRe.exec(at(i));
                if (!match) break;
                items.push(`<li>${renderInline(match[1] ?? '')}</li>`);
                i++;
            }
            const tag = ordered ? 'ol' : 'ul';
            out.push(`<${tag}>${items.join('')}</${tag}>`);
            continue;
        }

        const buf: string[] = [];
        while (i < lines.length && at(i).trim() !== '' && !startsBlock(at(i))) {
            buf.push(at(i));
            i++;
        }
        if (buf.length === 0) {
            // Safety net so an unexpected line can never loop forever.
            buf.push(at(i));
            i++;
        }
        out.push(`<p>${buf.map(renderInline).join('<br />')}</p>`);
    }

    return out.join('\n');
}

/** Tailwind arbitrary-variant classes that style the rendered HTML. */
export const PROSE_CLASSES = [
    '[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold',
    '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold',
    '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
    '[&_p]:my-3',
    '[&_a]:text-primary [&_a]:underline',
    '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6',
    '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
    '[&_li]:my-1',
    '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]',
    '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3',
    '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
    '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
    '[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded',
    '[&_hr]:my-6 [&_hr]:border-border',
].join(' ');
