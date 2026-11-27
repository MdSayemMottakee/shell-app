import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { appManifest } from '../lib/manifest';
import { useAppPath } from '../lib/useAppPath';
import { cn } from '../lib/cn';

export const AppHeader: React.FC<{ className?: string }> = ({ className }) => {
    const title = appManifest.displayName || appManifest.name || 'App';
    const logoUrl = appManifest.theme?.logoUrl?.trim();
    const { pathname } = useLocation();

    const homePath = useAppPath('home');
    const analyticsPath = useAppPath('analytics');
    const managePath = useAppPath('manage');
    const auditPath = useAppPath('audit');

    const navItems = [
        { label: 'Repositories', to: homePath },
        { label: 'Analytics', to: analyticsPath },
        { label: 'Manage', to: managePath },
        { label: 'Audit', to: auditPath },
    ];

    return (
        <header
            className={cn(
                'flex h-12 items-center gap-6 border-b border-border bg-card px-6',
                className,
            )}
        >
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
                {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-6 max-w-[120px] object-contain" />
                ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                        B
                    </div>
                )}
                <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>

            {/* Nav divider */}
            <div className="h-5 w-px bg-border" />

            {/* Nav links */}
            <nav className="flex items-center gap-1">
                {navItems.map(({ label, to }) => {
                    const active = pathname.endsWith(to.replace(/^.*\/apps\/[^/]+/, '')) ||
                        (label === 'Blog' && (pathname.endsWith('/home') || pathname.endsWith('/apps/' + appManifest.name)));
                    return (
                        <Link
                            key={label}
                            to={to}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
};
