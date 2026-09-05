import React, { useState, useEffect } from 'react';
import { fetchJson } from '../services/api';
import { Sliders, Save, CheckCircle, Shield, Key, Bell } from 'lucide-react';
import { UserRole } from '../types';

interface SettingsProps {
  currentUserRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUserRole, onRoleChange }) => {
  const [weights, setWeights] = useState({
    price: 30,
    iqr: 20,
    benford: 15,
    hhi: 15,
    photo: 20,
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { fetchJson('/settings/weights').then(setWeights).catch(e => setError(e.message)); }, []);

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const totalWeight = weights.price + weights.iqr + weights.benford + weights.hhi + weights.photo;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetchJson('/settings/weights', { method: 'PUT', body: JSON.stringify(weights) });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Platform Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Detection engine weights, threshold tuning, and prototype security configurations</p>
        </div>
      </div>

      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Weights saved on this device. Run the Data Ingestion pipeline to recalculate scores.</span>
        </div>
      )}

      {/* Detection Engine Weights Tuner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Multi-Signal Composite Weights (%)</h2>
            <p className="text-xs text-slate-500">Transparent linear aggregation formula: $Score = \sum (w_i \times s_i)$</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            totalWeight === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            Total Weight: {totalWeight}% {totalWeight === 100 ? '(Balanced)' : '(Must equal 100%)'}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>1. GeM Price Benchmarking Weight</span>
                <span className="text-blue-600 font-mono">{weights.price}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.price}
                onChange={(e) => handleWeightChange('price', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>2. Statistical IQR Outlier Weight</span>
                <span className="text-blue-600 font-mono">{weights.iqr}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.iqr}
                onChange={(e) => handleWeightChange('iqr', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>3. Benford's Law Leading Digit Weight</span>
                <span className="text-blue-600 font-mono">{weights.benford}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.benford}
                onChange={(e) => handleWeightChange('benford', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>4. Vendor Concentration (HHI) Weight</span>
                <span className="text-blue-600 font-mono">{weights.hhi}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.hhi}
                onChange={(e) => handleWeightChange('hhi', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>5. Photo & Geo Duplicate Forensics Weight</span>
                <span className="text-blue-600 font-mono">{weights.photo}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={weights.photo}
                onChange={(e) => handleWeightChange('photo', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={totalWeight !== 100}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Weights Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* Integration API Keys & Role Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">API Connection Secrets</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">GeM Catalog API Endpoint</span>
              <input
                type="text"
                readOnly
                value="https://api.gem.gov.in/v2/catalog/benchmarks"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700"
              />
            </div>
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">eSAKSHI Webhook API Secret</span>
              <input
                type="password"
                readOnly
                value="••••••••••••••••••••••••"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC)</h3>
          </div>
          <p className="text-xs text-slate-600">
            NIRIKSHAN enforces state and constituency-level data access restrictions based on official government credentials.
          </p>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 font-medium">
            Active Session Role: <strong className="font-bold">{currentUserRole}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
