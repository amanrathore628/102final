import React, { ReactNode } from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

/** Shown when a data set is empty (no search results, empty table, etc.). */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There are no records matching your current filters.',
  icon: Icon = Inbox,
  action,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <Icon className="w-8 h-8 text-slate-300" />
        <p className="text-xs text-slate-400 font-medium">{title}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center">
        <Icon className="w-10 h-10 text-slate-300" />
      </div>
      <div className="text-center max-w-xs">
        <h3 className="text-sm font-bold text-slate-700 mb-1">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
