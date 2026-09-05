import React, { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  /** Tailwind width class e.g. 'w-24' or 'w-1/3' */
  width?: string;
  /** Custom cell renderer */
  render?: (value: any, row: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
  keyField?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Caption above the table (row count summary) */
  caption?: string;
  compact?: boolean;
}

/**
 * Reusable sortable data table.
 * Replaces all the ad-hoc <table> implementations in each page.
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  onRowClick,
  keyField = 'id',
  emptyTitle = 'No records found',
  emptyMessage = 'There are no records matching your current filters.',
  caption,
  compact = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const cell = compact ? 'py-2 px-3' : 'py-3 px-3';

  return (
    <div className="overflow-x-auto">
      {caption && (
        <p className="text-[11px] text-slate-400 font-medium px-1 pb-2">{caption}</p>
      )}
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-y border-slate-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key, col.sortable)}
                className={`${cell} text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none ${
                  col.sortable ? 'cursor-pointer hover:text-slate-800 transition-colors' : ''
                } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.width ?? ''}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span className="text-slate-300">
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3 h-3 text-blue-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-blue-500" />
                        )
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {loading ? (
            <tr>
              <td colSpan={columns.length}>
                <LoadingState variant="table" rows={5} />
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} message={emptyMessage} compact />
              </td>
            </tr>
          ) : (
            sorted.map((row, idx) => (
              <tr
                key={row[keyField] ?? idx}
                onClick={() => onRowClick?.(row)}
                className={`table-row-hover ${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50/80 transition-colors`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${cell} ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row[col.key], row, idx) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
