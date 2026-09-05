import React, { useEffect, useState } from 'react';
import { fetchJson } from '../../services/api';

export interface FilterConfig {
  key: string;
  label: string;
  /** Static options (used if dynamic is false or fetch fails) */
  staticOptions?: string[];
  /** Which key from /api/filters response to use for dynamic options */
  dynamicKey?: string;
  value: string;
  allLabel?: string; // e.g. "All India", "All Categories"
  onChange: (value: string) => void;
}

interface FilterBarProps {
  filters: FilterConfig[];
  /** If true, fetches options from /api/filters and merges with staticOptions */
  dynamic?: boolean;
  className?: string;
}

/**
 * Renders a row of select dropdowns.
 * Pass `dynamic={true}` to auto-populate options from /api/filters.
 * Falls back to staticOptions if the fetch fails.
 */
export const FilterBar: React.FC<FilterBarProps> = ({ filters, dynamic = false, className = '' }) => {
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!dynamic) return;
    fetchJson('/filters')
      .then((data: any) => setDynamicOptions(data))
      .catch(() => {/* silently fall back to static options */});
  }, [dynamic]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {filters.map((f) => {
        const options =
          dynamic && f.dynamicKey && dynamicOptions[f.dynamicKey]
            ? dynamicOptions[f.dynamicKey]
            : f.staticOptions ?? [];

        const allLabel = f.allLabel ?? `All ${f.label}s`;

        return (
          <select
            key={f.key}
            id={`filter-${f.key}`}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="">{allLabel}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
};
