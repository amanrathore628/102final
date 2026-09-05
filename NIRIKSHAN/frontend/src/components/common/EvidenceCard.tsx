import React, { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, Info, LucideIcon } from 'lucide-react';

type EvidenceStatus = 'flagged' | 'elevated' | 'normal' | 'info';

interface EvidenceCardProps {
  /** Engine name */
  title: string;
  /** Score 0–100 */
  score: number;
  /** Weight percentage (e.g. 30 for 30%) */
  weight: number;
  status: EvidenceStatus;
  /** Optional icon override */
  icon?: LucideIcon;
  children: ReactNode;
  /** Small disclaimer text at the bottom */
  disclaimer?: string;
}

const STATUS_STYLES: Record<EvidenceStatus, { card: string; badge: string; icon: LucideIcon; label: string }> = {
  flagged:  {
    card:  'border-rose-200 bg-gradient-to-br from-rose-50/60 to-white',
    badge: 'bg-rose-600 text-white',
    icon:  AlertTriangle,
    label: 'FLAGGED',
  },
  elevated: {
    card:  'border-amber-200 bg-gradient-to-br from-amber-50/60 to-white',
    badge: 'bg-amber-500 text-white',
    icon:  TrendingUp,
    label: 'ELEVATED',
  },
  normal: {
    card:  'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white',
    badge: 'bg-emerald-600 text-white',
    icon:  CheckCircle2,
    label: 'NORMAL',
  },
  info: {
    card:  'border-slate-200 bg-white',
    badge: 'bg-slate-600 text-white',
    icon:  Info,
    label: 'INFO',
  },
};

/**
 * Signal evidence display card — used in RiskEvidence page for each of the 5 detection engines.
 * Shows the engine name, score, weight, status pill, and a content slot for detailed evidence.
 */
export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  title,
  score,
  weight,
  status,
  icon,
  children,
  disclaimer,
}) => {
  const s = STATUS_STYLES[status];
  const Icon = icon ?? s.icon;

  return (
    <div className={`rounded-2xl border p-5 ${s.card}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.badge} shadow-sm`}>
            <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">{title}</h3>
            <p className="text-[11px] text-slate-500 font-medium">Weight: {weight}%</p>
          </div>
        </div>

        {/* Score + status */}
        <div className="text-right shrink-0">
          <div className="text-2xl font-black text-slate-900 leading-none">{Math.round(score)}</div>
          <div className="text-[9px] text-slate-400 font-medium mb-1">/ 100</div>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${s.badge}`}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Content slot */}
      <div className="text-xs">{children}</div>

      {/* Disclaimer */}
      {disclaimer && (
        <p className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-medium italic">
          {disclaimer}
        </p>
      )}
    </div>
  );
};
