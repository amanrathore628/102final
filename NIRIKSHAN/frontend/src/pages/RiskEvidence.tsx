import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import {
  FileText,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  MapPin,
  TrendingUp,
  Camera,
  ShieldAlert,
} from 'lucide-react';
import { getWorkEvidence, API_BASE } from '../services/api';
import { formatINR } from '../utils/formatters';
import { RiskEvidenceData } from '../types';

interface RiskEvidenceProps {
  workCode: string;
  onNavigate: (route: string) => void;
}

export const RiskEvidence: React.FC<RiskEvidenceProps> = ({ workCode, onNavigate }) => {
  const [evidence, setEvidence] = useState<RiskEvidenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getWorkEvidence(workCode || 'MPLADS-BR-00481');
        setEvidence(data);
      } catch (err) {
        console.error('Failed to load evidence:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workCode]);

  if (loading || !evidence) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Assembling 5-module forensic evidence receipt for {workCode}...</p>
      </div>
    );
  }

  const pMod = evidence.module_1_price;
  const iMod = evidence.module_2_iqr;
  const bMod = evidence.module_3_benford;
  const hMod = evidence.module_4_hhi;
  const phMod = evidence.module_5_photo;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(`/works/${evidence.work_code}`)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Risk Evidence Receipts</h1>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Work: <span className="font-bold text-slate-900">{evidence.work_name}</span> | Work ID:{' '}
            <span className="font-mono font-bold text-blue-700">{evidence.work_code}</span> | Composite Score:{' '}
            <span className="font-bold text-red-600">{evidence.composite_score}/100 — {evidence.risk_level} RISK</span>
          </p>
        </div>

        <button
          onClick={() => window.open(`${API_BASE}/reports/download?type=Evidence_${evidence.work_code}&format=CSV`, '_blank')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
        >
          Export Evidence Receipt (CSV)
        </button>
      </div>

      {/* Row 1: Module 1 (Price Benchmarking) & Module 2 (IQR Outlier) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Module 1: Price Benchmarking */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Module 1 — GeM Price Benchmarking
              </span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                Score: {pMod?.score || 91} / 100
              </span>
            </div>

            <div className="overflow-x-auto mb-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-y border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">Item</th>
                    <th className="py-2 px-2.5 text-right">Reported</th>
                    <th className="py-2 px-2.5 text-right">GeM Ref</th>
                    <th className="py-2 px-2.5 text-right">Variance %</th>
                    <th className="py-2 px-2.5 text-center">Match %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(pMod?.evidence_table || []).map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 font-semibold text-slate-800">{row.item_name}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{formatINR(row.reported_price)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600">{row.gem_reference_price ? formatINR(row.gem_reference_price) : 'N/A'}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-red-600">
                        {row.variance_pct > 0 ? `+${row.variance_pct}%` : `${row.variance_pct}%`}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {row.match_confidence}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
            <span className="font-bold">Price Outlier Analysis: </span>
            {pMod?.explanation || 'Items exhibit pricing above reference thresholds.'}
          </div>
        </div>

        {/* Module 2: Statistical IQR Outlier */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Module 2 — Statistical IQR Outlier
              </span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                Score: {iMod?.score || 84} / 100
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Observed Work</span>
                <span className="font-bold font-mono text-slate-900">{formatINR(iMod?.observed_value || evidence.expenditure)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">District Median</span>
                <span className="font-bold font-mono text-slate-900">{formatINR(iMod?.median || 1450000)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">IQR Upper Bound</span>
                <span className="font-bold font-mono text-amber-700">{formatINR(iMod?.upper_bound || 1820000)}</span>
              </div>
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-200">
                <span className="text-[10px] text-red-600 block font-semibold">Status</span>
                <span className="font-black text-red-700">{iMod?.outlier_status || 'OUTLIER'}</span>
              </div>
            </div>

            {/* Box plot visual diagram */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center relative py-6">
              <div className="w-full h-1 bg-slate-300 relative top-3"></div>
              <div className="relative flex justify-between text-[10px] font-bold text-slate-500 mt-2">
                <span>Q1 (₹11.5L)</span>
                <span className="bg-blue-100 border border-blue-400 px-3 py-1 rounded text-blue-900 font-bold z-10 -mt-5">
                  Median (₹14.5L)
                </span>
                <span>Q3 (₹16.8L)</span>
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-black z-10 -mt-5">
                  Observed: ₹21.5L (Outlier)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 font-medium mt-3">
            <span className="font-bold">IQR Statistical Evaluation: </span>
            {iMod?.explanation || 'Expenditure statistically exceeds upper quartile bounds.'}
          </div>
        </div>
      </div>

      {/* Row 2: Module 3 (Benford's Law) & Module 4 (Vendor HHI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Module 3: Benford's Law */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Module 3 — Benford's Law Frequency
                </span>
                <p className="text-[10px] text-slate-400">First-digit distribution across district transactions</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                Score: {bMod?.score || 61} / 100
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bMod?.distribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="digit" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="expected_pct" name="Expected (Benford's Law)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="observed_pct" name="Observed Frequency" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium mt-2">
            <span className="font-bold">Screening Signal: </span>
            {bMod?.explanation || 'Moderate statistical divergence in leading digit frequencies.'}
          </div>
        </div>

        {/* Module 4: Vendor HHI */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Module 4 — Vendor Concentration (HHI)
                </span>
                <p className="text-[10px] text-slate-400">Market share distribution in constituency</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                HHI: {hMod?.hhi_score || 3120}
              </span>
            </div>

            <div className="space-y-2 py-2">
              {(hMod?.vendor_shares || []).slice(0, 4).map((v, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800 truncate max-w-[200px]">{idx + 1}. {v.vendor_name}</span>
                    <span className="text-slate-900 font-mono">{formatINR(v.expenditure)} ({v.share_pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${idx === 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, v.share_pct * 1.8)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 font-medium mt-2">
            <span className="font-bold">Market Concentration: </span>
            {hMod?.explanation || 'High vendor concentration detected in this district cohort.'}
          </div>
        </div>
      </div>

      {/* Row 3: Module 5 (Photo & Geo Similarity Forensics) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Module 5 — Photo & Duplicate Forensics
            </span>
            <p className="text-[10px] text-slate-400">Perceptual image hashing + Haversine GPS proximity</p>
          </div>
          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
            Score: {phMod?.score || 88} / 100
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Photo Similarity</span>
            <div className="text-xl font-black text-red-600 mt-1">{phMod?.photo_similarity_pct || 88}%</div>
            <span className="text-[10px] text-slate-500">Perceptual Hash</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">GPS Distance</span>
            <div className="text-xl font-black text-red-600 mt-1">{phMod?.geo_distance_m || 115}m</div>
            <span className="text-[10px] text-red-600 font-bold">Suspicious Colocation</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Text Overlap</span>
            <div className="text-xl font-black text-amber-600 mt-1">{phMod?.text_similarity_pct || 91}%</div>
            <span className="text-[10px] text-slate-500">Project Title Overlap</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Combined Confidence</span>
            <div className="text-xl font-black text-red-700 mt-1">{phMod?.combined_confidence || 'HIGH'}</div>
            <span className="text-[10px] text-slate-500">Prioritized for Review</span>
          </div>
        </div>

        <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
          <span className="font-bold">Forensic Duplicate Analysis: </span>
          {phMod?.explanation || 'Photo similarity and geographic proximity indicate a possible duplicate submission.'}
        </div>
      </div>

      {/* Row 4: Audit Evidence Events */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Audit Evidence Log</h3>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-y border-slate-200">
            <tr>
              <th className="py-2 px-3">Timestamp</th>
              <th className="py-2 px-3">Actor</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {(evidence.audit_evidence || []).map((ev) => (
              <tr key={ev.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-slate-500">{ev.timestamp}</td>
                <td className="py-2.5 px-3 font-bold text-slate-900">{ev.actor}</td>
                <td className="py-2.5 px-3 text-slate-600">{ev.role}</td>
                <td className="py-2.5 px-3 text-slate-800">{ev.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
