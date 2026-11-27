import React from 'react';
import { cn } from '../lib/cn';

const COLOR_MAP: Record<string, string> = {
    technical: 'border-blue-200 bg-blue-50 text-blue-700',
    research: 'border-purple-200 bg-purple-50 text-purple-700',
    announcement: 'border-amber-200 bg-amber-50 text-amber-700',
    tutorial: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    guide: 'border-teal-200 bg-teal-50 text-teal-700',
    core: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    default: 'border-border bg-muted/70 text-muted-foreground',
};

export const CategoryBadge: React.FC<{
    category: string;
    size?: 'sm' | 'md';
    className?: string;
}> = ({ category, size = 'sm', className }) => {
    const key = category.trim().toLowerCase();
    const colorStyle = COLOR_MAP[key] || COLOR_MAP.default;

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md border font-medium uppercase tracking-wider',
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
                colorStyle,
                className,
            )}
        >
            #{category}
        </span>
    );
};
