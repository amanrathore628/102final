import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Circle } from 'lucide-react';

type TimelineStatus = 'completed' | 'active' | 'flagged' | 'pending';

export interface TimelineItem {
  title: string;
  date: string;
  actor: string;
  status: TimelineStatus;
  details?: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

const STATUS_CONFIG: Record<TimelineStatus, { icon: React.FC<any>; dot: string; line: string }> = {
  completed: { icon: CheckCircle2, dot: 'bg-emerald-500 border-emerald-300', line: 'bg-emerald-300' },
  active:    { icon: Clock,         dot: 'bg-blue-500 border-blue-300',    line: 'bg-blue-200'    },
  flagged:   { icon: AlertTriangle, dot: 'bg-rose-500 border-rose-300',    line: 'bg-rose-200'    },
  pending:   { icon: Circle,        dot: 'bg-slate-300 border-slate-200',  line: 'bg-slate-200'   },
};

/** Vertical timeline with status icons. Replaces inline JSX in WorkInvestigation. */
export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  return (
    <ol className="space-y-0">
      {items.map((item, idx) => {
        const cfg = STATUS_CONFIG[item.status];
        const Icon = cfg.icon;
        const isLast = idx === items.length - 1;

        return (
          <li key={idx} className="flex gap-4">
            {/* Dot + vertical line column */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${cfg.dot}`}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              {!isLast && <div className={`w-0.5 flex-1 mt-1 mb-1 min-h-[1.5rem] ${cfg.line}`} />}
            </div>

            {/* Content */}
            <div className={`${isLast ? '' : 'pb-5'} flex-1 min-w-0`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.date}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.actor}</p>
              {item.details && (
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.details}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
