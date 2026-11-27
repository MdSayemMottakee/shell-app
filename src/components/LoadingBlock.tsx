import React from 'react';

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
    <div className="px-6 py-12 text-center text-sm text-muted-foreground">{label}</div>
);
