import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Sliders,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { getRiskAnalysisStats, getRiskMatrix, getSignalPerformance } from '../services/api';

interface RiskAnalysisProps {
  onNavigate: (route: string) => void;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [scatterPoints, setScatterPoints] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [sData, mData, sigData] = await Promise.all([
          getRiskAnalysisStats(),
          getRiskMatrix(),
          getSignalPerformance(),
        ]);
        setStats(sData);
        setScatterPoints(mData.scatter_points || []);
        setSignals(sigData.signals || []);
      } catch (err) {
        console.error('Failed to load risk analysis:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Portfolio Risk Analysis</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Macro risk matrix, exposure clustering, and detection engine performance benchmarking</p>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Works Analyzed</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats?.works_analyzed?.toLocaleString('en-IN') ?? 0}</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">High Risk (Red)</span>
          <div className="text-2xl font-black text-rose-900 mt-1">{stats?.high_risk_count?.toLocaleString('en-IN') ?? 0}</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Medium Risk (Yellow)</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{stats?.medium_risk_count?.toLocaleString('en-IN') ?? 0}</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Low Risk (Green)</span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats?.low_risk_count?.toLocaleString('en-IN') ?? 0}</div>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Average Risk Score</span>
          <div className="text-2xl font-black text-blue-900 mt-1">{stats?.average_risk_score ?? 0} <span className="text-xs font-normal">/ 100</span></div>
        </div>
      </div>

      {/* Risk Matrix Scatter Plot */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Portfolio Risk Exposure Matrix</h2>
            <p className="text-xs text-slate-500">Risk Score (X-axis) vs Financial Exposure ₹ Lakhs (Y-axis) · Click any work node to open dossier</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Low Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Medium Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> High Value / High Risk</span>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                type="number"
                dataKey="risk_score"
                name="Risk Score"
                unit=""
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#64748B' }}
                label={{ value: 'Risk Score (0 - 100)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#475569' }}
              />
              <YAxis
                type="number"
                dataKey="financial_exposure_lakhs"
                name="Financial Exposure"
                unit="L"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#64748B' }}
                label={{ value: 'Sanctioned Value (₹ Lakhs)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#475569' }}
              />
              <ZAxis type="number" dataKey="size" range={[60, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-xl space-y-1">
                        <div className="font-bold text-blue-400 font-mono">{data.id}</div>
                        <div className="text-[11px] text-slate-300">{data.category}</div>
                        <div>Risk Score: <strong>{data.risk_score}</strong></div>
                        <div>Sanction: <strong>₹{data.financial_exposure_lakhs} Lakhs</strong></div>
                        <div className="text-[10px] text-amber-300 pt-0.5">Click to inspect work dossier</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                data={scatterPoints}
                onClick={(node: any) => {
                  if (node && node.id) {
                    onNavigate(`/works/${node.id}`);
                  }
                }}
                className="cursor-pointer"
              >
                {scatterPoints.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.75} stroke={entry.color} strokeWidth={1.5} className="cursor-pointer hover:opacity-100 transition-opacity" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Signal Performance Summary Cards */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Detection Engines Health & Contribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {signals.map((sig, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">{sig.name}</span>
                <span className="text-[10px] text-slate-500">Cases Flagged: <strong className="text-slate-800">{sig.cases_flagged?.toLocaleString('en-IN')}</strong></span>
              </div>

              <div className="space-y-1 text-[11px] pt-2 border-t border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Portfolio Share:</span>
                  <strong className="text-slate-800">{sig.portfolio_pct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg Contribution:</span>
                  <strong className="text-blue-700">{sig.avg_contribution}</strong>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {sig.status}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Weight: {idx === 0 ? '30%' : idx === 1 ? '20%' : '15%'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
