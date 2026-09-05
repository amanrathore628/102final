import React, { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Small pill badge */
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate';
  /** Right-side header actions */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Min-height for the chart area */
  chartHeight?: string;
}

const BADGE_COLORS: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50 text-amber-700',
  red:     'bg-rose-50 text-rose-700',
  slate:   'bg-slate-100 text-slate-600',
};

/**
 * Premium card wrapper for Recharts visualisations.
 * Provides consistent title, subtitle, badge, and action slot.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  actions,
  children,
  className = '',
  chartHeight = 'h-56',
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-snug">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {badge && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BADGE_COLORS[badgeColor]}`}>
              {badge}
            </span>
          )}
          {actions}
        </div>
      </div>

      {/* Chart area */}
      <div className={`px-4 pb-4 flex-1 ${chartHeight} min-h-0`}>
        {children}
      </div>
    </div>
  );
};

// ── Shared dark tooltip for all Recharts charts ─────────────────────────────

interface DarkTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: any; color?: string }>;
  label?: string;
  formatter?: (name: string, value: any) => string;
}

export const DarkTooltip: React.FC<DarkTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl px-3 py-2.5 text-xs min-w-[120px]">
      {label && <p className="text-slate-400 font-medium mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            {entry.color && (
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: entry.color }}
              />
            )}
            {entry.name}
          </span>
          <span className="font-bold text-white">
            {formatter ? formatter(entry.name, entry.value) : entry.value?.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
};
