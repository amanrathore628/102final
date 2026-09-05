import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppContext, Toast, ToastType } from '../../context/AppContext';

// ── Individual Toast Item ─────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<ToastType, { bar: string; icon: string; bg: string; border: string; text: string; Icon: React.FC<any> }> = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', bg: 'bg-white', border: 'border-emerald-200', text: 'text-slate-800', Icon: CheckCircle2  },
  error:   { bar: 'bg-rose-500',    icon: 'text-rose-500',    bg: 'bg-white', border: 'border-rose-200',    text: 'text-slate-800', Icon: XCircle       },
  warning: { bar: 'bg-amber-500',   icon: 'text-amber-500',   bg: 'bg-white', border: 'border-amber-200',   text: 'text-slate-800', Icon: AlertTriangle  },
  info:    { bar: 'bg-blue-500',    icon: 'text-blue-500',    bg: 'bg-white', border: 'border-blue-200',    text: 'text-slate-800', Icon: Info           },
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const s = TOAST_STYLES[toast.type];
  const Icon = s.Icon;

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 220);
  };

  return (
    <div
      className={`relative flex items-start gap-3 w-80 rounded-xl shadow-lg border overflow-hidden ${s.bg} ${s.border} ${
        exiting ? 'toast-exit' : 'toast-enter'
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />

      <div className="flex items-start gap-3 flex-1 px-4 py-3 pl-5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.icon}`} />
        <p className={`text-xs font-medium leading-snug flex-1 ${s.text}`}>{toast.message}</p>
        <button
          onClick={dismiss}
          className="ml-2 text-slate-400 hover:text-slate-700 transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Toast Container ───────────────────────────────────────────────────────────

/**
 * Fixed toast container that renders at the top-right of the viewport.
 * Must be placed inside <AppProvider>. Reads toasts from context automatically.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
};
