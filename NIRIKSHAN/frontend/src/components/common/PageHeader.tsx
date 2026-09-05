import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Pill badge next to title (e.g. "PROTOTYPE", "LIVE DATA") */
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'red' | 'slate';
  /** Icon to render before the title */
  icon?: LucideIcon;
  /** Action buttons / controls slot */
  actions?: ReactNode;
  /** Optional filter row below the title */
  filters?: ReactNode;
}

const BADGE_COLORS: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red:     'bg-rose-50 text-rose-700 border-rose-200',
  slate:   'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * Standardised page header with title, subtitle, optional badge, icon, and action slot.
 * Replaces the one-off header divs in every page component.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  icon: Icon,
  actions,
  filters,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
        {/* Title row */}
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-slate-900 truncate">{title}</h1>
              {badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                    BADGE_COLORS[badgeColor]
                  }`}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {/* Filter row — only rendered if passed */}
      {filters && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3">
          {filters}
        </div>
      )}
    </div>
  );
};
