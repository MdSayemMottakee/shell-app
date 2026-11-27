import React from 'react';
import { cn } from '../../lib/cn';

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
    return (
        <textarea
            ref={ref}
            className={cn(
                'min-h-[5.5rem] w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
});
