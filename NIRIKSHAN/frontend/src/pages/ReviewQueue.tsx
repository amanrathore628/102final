import React, { useEffect, useState } from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  Send,
  Eye,
  CheckCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskScoreGauge } from '../components/common/RiskScoreGauge';
import { getReviewQueue, submitReviewDecision, assignReviewer, API_BASE } from '../services/api';
import { formatINR } from '../utils/formatters';
import { ReviewQueueItem, UserRole } from '../types';

interface ReviewQueueProps {
  onNavigate: (route: string) => void;
  currentUserRole: UserRole;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ onNavigate, currentUserRole }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [cases, setCases] = useState<ReviewQueueItem[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<ReviewQueueItem | null>(null);

  // Decision state
  const [decision, setDecision] = useState('Investigation Required');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await getReviewQueue({ tab: activeTab });
      setCases(data.items || []);
      setKpis(data.kpis);
      if (data.items?.length > 0 && !selectedCase) {
        setSelectedCase(data.items[0]);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [activeTab]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !selectedCase) return;
    try {
      setSubmitting(true);
      await submitReviewDecision(selectedCase.id, {
        reviewer_name: 'P. Sharma',
        reviewer_role: currentUserRole,
        decision,
        comment,
      });
      setSuccessMsg(`Decision '${decision}' recorded!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setComment('');
      loadQueue();
    } catch (err) {
      console.error('Failed to submit decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'All', label: 'All Cases', count: kpis?.all_cases ?? 0 },
    { id: 'High Risk', label: 'High Risk', count: kpis?.high_risk ?? 0 },
    { id: 'Medium Risk', label: 'Medium Risk', count: kpis?.medium_risk ?? 0 },
    { id: 'Overdue', label: 'Overdue (30+ d)', count: kpis?.overdue ?? 0 },
    { id: 'Assigned to Me', label: 'Assigned to Me', count: kpis?.assigned_to_me ?? 0 },
    { id: 'Escalated', label: 'Escalated', count: kpis?.escalated ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Review Queue</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Evidence-backed cases requiring human assessment, audit rulings & escalations</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`${API_BASE}/reports/download?type=ReviewQueue&format=CSV`, '_blank')}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition"
          >
            Export Queue
          </button>
        </div>
      </div>

      {/* KPI Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeTab === tab.id
                ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">{tab.label}</span>
            <div className="text-xl font-black text-slate-900 mt-1">{tab.count.toLocaleString('en-IN')}</div>
          </button>
        ))}
      </div>

      {/* Main Split View: Queue Table + Selected Case Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Queue Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Work / ID</th>
                  <th className="py-3 px-3.5">District</th>
                  <th className="py-3 px-3.5 text-center">Risk Score</th>
                  <th className="py-3 px-3.5">Active Signals</th>
                  <th className="py-3 px-3.5">Assigned</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                          c.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 truncate max-w-[170px]">{c.work_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.work_code}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{c.district}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold text-white ${
                          c.risk_score >= 80 ? 'bg-red-600' : 'bg-amber-500'
                        }`}>
                          {c.risk_score}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {c.signals_summary}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 text-[11px]">{c.assigned_to}</td>
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onNavigate(`/works/${c.work_code}`)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-[11px] font-bold border border-blue-200 transition"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Showing {cases.length} prioritize review cases
          </div>
        </div>

        {/* Right: Selected Case Review Drawer */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {selectedCase ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Case Assessment</h2>
                  <p className="text-xs font-mono font-bold text-blue-700">{selectedCase.work_code}</p>
                </div>
                <button
                  onClick={() => onNavigate(`/works/${selectedCase.work_code}`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Full File</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Case Summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-900">{selectedCase.work_name}</div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>District: <strong className="text-slate-800">{selectedCase.district}</strong></span>
                  <span>Expenditure: <strong className="text-slate-900 font-mono">{formatINR(selectedCase.expenditure)}</strong></span>
                </div>
              </div>

              {/* Risk Score */}
              <div className="flex items-center justify-between p-3 bg-red-50/60 rounded-xl border border-red-200">
                <div>
                  <span className="text-[10px] font-bold text-red-700 uppercase">Composite Risk Score</span>
                  <div className="text-2xl font-black text-red-600">{selectedCase.risk_score} / 100</div>
                  <span className="text-[10px] text-slate-500">High Prioritization</span>
                </div>
                <RiskScoreGauge score={selectedCase.risk_score} riskLevel={selectedCase.risk_level} size={70} />
              </div>

              {/* Quick Decision Form */}
              <form onSubmit={handleDecisionSubmit} className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Record Review Verdict</h3>

                {successMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Decision</label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Investigation Required">Investigation Required</option>
                    <option value="Requires Clarification">Requires Clarification</option>
                    <option value="Legitimate Variance">Legitimate Variance</option>
                    <option value="Escalate">Escalate to Higher Authority</option>
                    <option value="No Issue">No Issue Found</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Justification Comments <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter official reasoning and next steps..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Decision'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Select a work to preview details and submit decisions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
