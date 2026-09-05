import React from 'react';
import { LucideIcon, AlertTriangle, AlertOctagon, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown, Clock, Layers } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'alert' | 'warning';
  icon?: LucideIcon;
  variant?: 'default' | 'alert' | 'warning' | 'critical' | 'success';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendType = 'neutral',
  icon: Icon,
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-gradient-to-br from-amber-50/90 to-amber-100/30 border-amber-200 text-amber-950 shadow-sm';
      case 'alert':
      case 'critical':
        return 'bg-gradient-to-br from-rose-50/90 to-rose-100/30 border-rose-200 text-rose-950 shadow-sm';
      case 'success':
        return 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/30 border-emerald-200 text-emerald-950 shadow-sm';
      default:
        return 'bg-white border-slate-200/90 text-slate-900 shadow-sm';
    }
  };

  const getIconBadgeStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-500 text-white shadow-amber-500/30';
      case 'alert':
      case 'critical':
        return 'bg-rose-500 text-white shadow-rose-500/30';
      case 'success':
        return 'bg-emerald-500 text-white shadow-emerald-500/30';
      default:
        return 'bg-blue-50 text-blue-600 border border-blue-100 shadow-blue-500/10';
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-md ${getVariantStyles()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {variant === 'warning' && (
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )}
        {(variant === 'alert' || variant === 'critical') && (
          <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-sm">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        )}
        {variant === 'success' && (
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        )}
        {variant === 'default' && Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${getIconBadgeStyles()}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="text-2xl font-black tracking-tight text-slate-900 mb-1">
        {value}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
        {trend && (
          <div className={`flex items-center gap-1 font-semibold ${
            trendType === 'positive' ? 'text-emerald-600' :
            trendType === 'negative' ? 'text-rose-600' :
            trendType === 'warning' ? 'text-amber-600' : 'text-slate-600'
          }`}>
            {trend.startsWith('+') || trend.includes('up') ? <TrendingUp className="w-3.5 h-3.5" /> : null}
            {trend.startsWith('-') ? <TrendingDown className="w-3.5 h-3.5" /> : null}
            <span>{trend}</span>
          </div>
        )}
        {subtitle && <span className="text-slate-500 ml-auto font-medium">{subtitle}</span>}
      </div>
    </div>
  );
};
