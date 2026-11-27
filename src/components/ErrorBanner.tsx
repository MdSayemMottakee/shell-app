import React from 'react';

export const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
    <div className="mx-6 mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {message}
    </div>
);
