import React from 'react';
import { cn } from '../../lib/cn';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
    className,
    ...props
}) => (
    <table className={cn('w-full border-collapse text-sm', className)} {...props} />
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
    className,
    ...props
}) => (
    <th
        className={cn(
            'border-b border-border px-3 py-2 text-left text-xs font-medium capitalize text-muted-foreground',
            className,
        )}
        {...props}
    />
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
    className,
    ...props
}) => (
    <td className={cn('border-b border-border px-3 py-2 text-foreground', className)} {...props} />
);
