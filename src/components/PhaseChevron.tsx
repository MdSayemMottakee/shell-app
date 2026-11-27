import React from 'react';
import { cn } from '../lib/cn';

export interface PhaseStep {
    id: string;
    label: string;
}

export const PhaseChevron: React.FC<{
    steps: readonly PhaseStep[];
    current: string;
    onSelect?: (id: string) => void;
    className?: string;
}> = ({ steps, current, onSelect, className }) => (
    <ol className={cn('flex flex-wrap items-stretch gap-0 text-sm', className)}>
        {steps.map((step, index) => {
            const selected = step.id === current;
            const past =
                steps.findIndex((s) => s.id === current) > index;
            return (
                <li key={step.id} className="flex min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={() => onSelect?.(step.id)}
                        className={cn(
                            'relative flex w-full items-center justify-center border border-border px-3 py-2 text-center',
                            index === 0 ? 'rounded-l' : '',
                            index === steps.length - 1 ? 'rounded-r' : '',
                            selected && 'bg-primary/10 text-foreground underline decoration-primary underline-offset-4',
                            !selected && past && 'bg-muted text-muted-foreground',
                            !selected && !past && 'bg-card text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'mr-2 inline-block h-2 w-2 rounded-full border',
                                selected ? 'border-primary bg-primary' : 'border-border bg-card',
                            )}
                        />
                        {step.label}
                    </button>
                </li>
            );
        })}
    </ol>
);
