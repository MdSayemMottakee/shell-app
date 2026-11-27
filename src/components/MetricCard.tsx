import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/cn';

export interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    subtext?: string;
    icon: React.ElementType;
    accentColor?: string;
    className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    change,
    trend = 'up',
    subtext,
    icon: Icon,
    accentColor = 'text-primary',
    className,
}) => {
    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md',
                className,
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {title}
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                        {value}
                    </p>
                </div>
                <div
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 transition-transform group-hover:scale-105',
                        accentColor,
                    )}
                >
                    <Icon size={20} />
                </div>
            </div>

            {(change || subtext) && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                    {change && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold tabular-nums',
                                trend === 'up' && 'bg-emerald-50 text-emerald-700',
                                trend === 'down' && 'bg-red-50 text-red-700',
                                trend === 'neutral' && 'bg-muted text-muted-foreground',
                            )}
                        >
                            {trend === 'up' && <ArrowUpRight size={12} />}
                            {trend === 'down' && <ArrowDownRight size={12} />}
                            {change}
                        </span>
                    )}
                    {subtext && <span className="text-muted-foreground truncate">{subtext}</span>}
                </div>
            )}
        </div>
    );
};
