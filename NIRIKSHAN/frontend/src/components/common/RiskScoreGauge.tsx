import React from 'react';
import { RiskLevel } from '../../types';

interface RiskScoreGaugeProps {
  score: number;
  riskLevel: RiskLevel | string;
  size?: number;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  riskLevel,
  size = 120,
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#EF4444'; // Red
    if (score >= 50) return '#F59E0B'; // Orange / Amber
    return '#10B981'; // Green
  };

  return (
    <div className="flex flex-col items-center justify-center relative select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center Value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
          {score}
        </span>
        <span className="text-[10px] font-semibold text-slate-400">/ 100</span>
      </div>
    </div>
  );
};
