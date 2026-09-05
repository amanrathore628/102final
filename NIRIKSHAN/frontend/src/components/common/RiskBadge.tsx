import React from 'react';
import { RiskLevel } from '../../types';
import { getRiskBadgeClass } from '../../utils/formatters';

interface RiskBadgeProps {
  level: RiskLevel | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const styles = getRiskBadgeClass(level);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-xs font-bold' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${styles.bg} ${styles.text} ${styles.border} ${sizeClass}`}>
      {score !== undefined && (
        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${styles.badge}`}>
          {score}
        </span>
      )}
      <span>{level}</span>
    </span>
  );
};
