import React from 'react';
import { getStatusBadgeClass } from '../../utils/formatters';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const badgeClass = getStatusBadgeClass(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badgeClass}`}>
      {status}
    </span>
  );
};
