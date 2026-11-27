import React from 'react';
import { cn } from '../../lib/cn';

export const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(function Checkbox({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            type="checkbox"
            className={cn(
                'gf-domain-checkbox h-4 w-4 shrink-0 cursor-pointer rounded border border-border bg-card',
                'accent-[hsl(var(--primary))]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
});
