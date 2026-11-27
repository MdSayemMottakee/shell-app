import React from 'react';
import { cn } from '../lib/cn';

const tones = {
    neutral: 'border-border bg-muted text-muted-foreground',
    open: 'border-border bg-muted text-foreground',
    progress: 'border-sky-200 bg-sky-50 text-sky-800',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-red-200 bg-red-50 text-red-800',
} as const;

export type StatusTone = keyof typeof tones;

export const StatusPill: React.FC<{
    children: React.ReactNode;
    tone?: StatusTone;
    className?: string;
}> = ({ children, tone = 'neutral', className }) => (
    <span
        className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            tones[tone],
            className,
        )}
    >
        {children}
    </span>
);
