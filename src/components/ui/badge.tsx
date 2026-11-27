import React from 'react';
import { cn } from '../../lib/cn';

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
    className,
    ...props
}) => (
    <span
        className={cn(
            'inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground',
            className,
        )}
        {...props}
    />
);
