import React from 'react';
import { cn } from '../../lib/cn';

export const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
    return (
        <select
            ref={ref}
            className={cn(
                'h-9 w-full rounded border border-border bg-card px-2 text-sm text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
            {...props}
        >
            {children}
        </select>
    );
});
