import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { UserRole } from '../types';

// ── Toast Types ──────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms, 0 = persist
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast];
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ── App Context Shape ────────────────────────────────────────────────────────

interface AppContextValue {
  /** Current prototype role */
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  /** Toast helpers */
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  /** Convenience shortcuts */
  toast: {
    success: (msg: string, duration?: number) => void;
    error:   (msg: string, duration?: number) => void;
    warning: (msg: string, duration?: number) => void;
    info:    (msg: string, duration?: number) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: ReactNode;
  initialRole?: UserRole;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  currentRole,
  onRoleChange,
}) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      dispatch({ type: 'ADD', toast: { id, type, message, duration } });
      if (duration > 0) {
        setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const toast = {
    success: (msg: string, d?: number) => addToast('success', msg, d),
    error:   (msg: string, d?: number) => addToast('error',   msg, d),
    warning: (msg: string, d?: number) => addToast('warning', msg, d),
    info:    (msg: string, d?: number) => addToast('info',    msg, d),
  };

  return (
    <AppContext.Provider
      value={{ currentRole, setRole: onRoleChange, toasts, addToast, removeToast, toast }}
    >
      {children}
    </AppContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}

/** Convenience alias */
export const useToast = () => useAppContext().toast;
