import React from 'react';
import { cn } from '../lib/cn';

export const PageHeader: React.FC<{
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}> = ({ title, description, actions, className }) => (
    <header
        className={cn(
            'flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-4',
            className,
        )}
    >
        <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
);
