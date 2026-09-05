import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** 'api' = connection error icon, 'generic' = alert circle */
  variant?: 'api' | 'generic';
  compact?: boolean;
}

/** Displays a user-facing error with an optional retry button. Never show blank white space on failure. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  variant = 'api',
  compact = false,
}) => {
  const Icon = variant === 'api' ? WifiOff : AlertCircle;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
        <Icon className="w-4 h-4 text-rose-500 shrink-0" />
        <span className="text-xs font-medium text-rose-700 flex-1">{title}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-sm">
        <Icon className="w-8 h-8 text-rose-400" />
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </div>
  );
};
