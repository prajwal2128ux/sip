/**
 * ScoreCard Component - Academic Metric Display
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'blue' | 'emerald' | 'rose' | 'amber' | 'neutral';
  tooltip?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'blue',
  tooltip
}) => {
  const variantStyles = {
    blue: {
      bg: 'bg-white',
      border: 'border-slate-200',
      valueColor: 'text-blue-700',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-emerald-200',
      valueColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    rose: {
      bg: 'bg-white',
      border: 'border-rose-200',
      valueColor: 'text-rose-700',
      iconBg: 'bg-rose-50 text-rose-600',
    },
    amber: {
      bg: 'bg-white',
      border: 'border-amber-200',
      valueColor: 'text-amber-700',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    neutral: {
      bg: 'bg-white',
      border: 'border-slate-200',
      valueColor: 'text-slate-900',
      iconBg: 'bg-slate-100 text-slate-600',
    }
  };

  const current = variantStyles[variant];

  return (
    <div
      title={tooltip}
      className={`${current.bg} border ${current.border} rounded-lg p-5 shadow-xs transition-shadow hover:shadow-sm`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
          {label}
        </span>
        {Icon && (
          <div className={`p-2 rounded-md ${current.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl md:text-3xl font-bold tracking-tight ${current.valueColor}`}>
          {value}
        </span>
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-700 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
};
