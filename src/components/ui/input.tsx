import React from 'react';
import { cn } from '../../lib/cn';

export const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                'h-9 w-full rounded border border-border bg-card px-3 text-sm text-foreground',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
});
