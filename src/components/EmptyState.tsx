import React from 'react';
import { Button } from './ui/button';

export const EmptyState: React.FC<{
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
);
