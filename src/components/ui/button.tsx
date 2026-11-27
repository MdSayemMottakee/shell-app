import React from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

export const Button = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = 'primary', type = 'button', ...props }, ref) {
    return (
        <button
            ref={ref}
            type={type}
            className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring',
                variant === 'primary' &&
                    'bg-primary text-primary-foreground hover:opacity-90',
                variant === 'secondary' &&
                    'border border-border bg-card text-foreground hover:bg-muted',
                variant === 'ghost' && 'text-foreground hover:bg-muted',
                className,
            )}
            {...props}
        />
    );
});
