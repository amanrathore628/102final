import { RiskLevel } from '../types';

export function formatINR(amount: number, inCrores: boolean = false): string {
  if (inCrores) {
    const cr = amount >= 10000000 ? amount / 10000000 : amount;
    return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatNumber(val: number): string {
  return val.toLocaleString('en-IN');
}

export function getRiskBadgeClass(level: RiskLevel | string): { bg: string; text: string; border: string; badge: string } {
  const norm = (level || '').toUpperCase();
  if (norm === 'CRITICAL') {
    return {
      bg: 'bg-red-50',
      text: 'text-red-900 font-semibold',
      border: 'border-red-300',
      badge: 'bg-red-700 text-white'
    };
  }
  if (norm === 'HIGH' || norm === 'RED') {
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700 font-semibold',
      border: 'border-rose-200',
      badge: 'bg-red-600 text-white'
    };
  }
  if (norm === 'MEDIUM' || norm === 'MODERATE' || norm === 'ORANGE' || norm === 'YELLOW') {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800 font-semibold',
      border: 'border-amber-200',
      badge: 'bg-amber-500 text-white'
    };
  }
  return {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700 font-semibold',
    border: 'border-emerald-200',
    badge: 'bg-emerald-600 text-white'
  };
}

export function getStatusBadgeClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('audit') || s.includes('escalated')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (s.includes('review') || s.includes('clarification')) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  if (s.includes('completed')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (s.includes('progress') || s.includes('sanctioned')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}
