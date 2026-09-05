import React from 'react';

interface LoadingStateProps {
  /** Number of skeleton rows to render (for 'table' variant) */
  rows?: number;
  /** Number of skeleton cards to render (for 'cards' variant) */
  cards?: number;
  /** Display style */
  variant?: 'page' | 'table' | 'cards' | 'inline';
  message?: string;
}

/** Reusable shimmer skeleton loader. Use instead of blank white space during data fetches. */
export const LoadingState: React.FC<LoadingStateProps> = ({
  rows = 5,
  cards = 4,
  variant = 'table',
  message,
}) => {
  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        {message && <p className="text-sm text-slate-500 font-medium">{message}</p>}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex justify-between items-start">
              <div className="skeleton h-2.5 w-24 rounded" />
              <div className="skeleton h-6 w-6 rounded-lg" />
            </div>
            <div className="skeleton h-8 w-20 rounded" />
            <div className="skeleton h-2 w-32 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 font-medium">{message || 'Loading…'}</span>
      </div>
    );
  }

  // default: 'table'
  return (
    <div className="space-y-2.5 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-3 py-2">
          <div className="skeleton h-4 w-12 rounded" style={{ opacity: 1 - i * 0.06 }} />
          <div className="skeleton h-4 flex-1 rounded" style={{ opacity: 1 - i * 0.06 }} />
          <div className="skeleton h-4 w-24 rounded" style={{ opacity: 1 - i * 0.06 }} />
          <div className="skeleton h-4 w-16 rounded" style={{ opacity: 1 - i * 0.06 }} />
          <div className="skeleton h-4 w-20 rounded" style={{ opacity: 1 - i * 0.06 }} />
        </div>
      ))}
    </div>
  );
};
