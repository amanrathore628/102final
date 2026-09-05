import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Calendar,
  Building,
  User,
  Clock,
  Download,
  AlertOctagon,
  Share2,
  FileCheck,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Send,
  Camera,
  Layers,
} from 'lucide-react';
import { RiskScoreGauge } from '../components/common/RiskScoreGauge';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { getWorkDetail, submitReviewDecision, assignReviewer, API_BASE } from '../services/api';
import { formatINR } from '../utils/formatters';
import { WorkDetail, UserRole } from '../types';

interface WorkInvestigationProps {
  workCode: string;
  onNavigate: (route: string) => void;
  currentUserRole: UserRole;
}

export const WorkInvestigation: React.FC<WorkInvestigationProps> = ({
  workCode,
  onNavigate,
  currentUserRole,
}) => {
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Review Form state
  const [decision, setDecision] = useState('Investigation Required');
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('P. Sharma');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getWorkDetail(workCode || 'MPLADS-BR-00481');
        setWork(data);
      } catch (err) {
        console.error('Failed to load work details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workCode]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !work?.review_case?.id) return;
    try {
      setSubmitting(true);
      await submitReviewDecision(work.review_case.id, {
        reviewer_name: reviewerName,
        reviewer_role: currentUserRole,
        decision,
        comment,
      });
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      // Reload work details
      const updated = await getWorkDetail(workCode);
      setWork(updated);
      setComment('');
    } catch (err) {
      console.error('Failed to submit decision:', err);
      alert('Failed to submit decision. Please check comments length.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !work) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Loading case file for {workCode}...</p>
      </div>
    );
  }

  const risk = work.risk_assessment;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{work.project_name}</h1>
            <StatusBadge status={work.status} />
          </div>
          <p className="text-xs font-mono font-bold text-slate-400 mt-1">Work ID: {work.work_code}</p>
        </div>

        {/* Right Actions & Gauge */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(`/works/${work.work_code}/evidence`)}
              className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold border border-blue-200 transition flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>Inspect Evidence Receipts</span>
            </button>

            <button
              onClick={() => window.open(`${API_BASE}/reports/download?type=${work.work_code}&format=CSV`, '_blank')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export Dossier</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Score</div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                risk.composite_score >= 80 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {risk.risk_level} RISK
              </span>
            </div>
            <RiskScoreGauge score={risk.composite_score} riskLevel={risk.risk_level} size={84} />
          </div>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sanctioned Amount</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatINR(work.sanctioned_amount)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expenditure Recorded</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatINR(work.expenditure)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fund Utilization</span>
          <div className="text-xl font-black text-blue-600 mt-1">{work.utilization_pct}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Physical Completion</span>
          <div className="text-xl font-black text-emerald-600 mt-1">{work.completion_pct}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Since Sanction</span>
          <div className="text-xl font-black text-slate-800 mt-1">{work.days_since_sanction} days</div>
        </div>
      </div>

      {/* Row 2: Project Information & Risk Score Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Project Information */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            Project Information
          </h2>

          <div className="grid grid-cols-2 gap-y-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Work ID</span>
              <span className="font-mono font-bold text-slate-900">{work.work_code}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Category</span>
              <span className="font-semibold text-slate-800">{work.category}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">State / District</span>
              <span className="font-semibold text-slate-800">{work.state}, {work.district}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Constituency / MP</span>
              <span className="font-semibold text-slate-800">{work.constituency}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Location (GPS)</span>
              <span className="font-mono text-slate-700 text-[11px]">{work.latitude.toFixed(4)}°N, {work.longitude.toFixed(4)}°E</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Sanction Date</span>
              <span className="font-semibold text-slate-800">{work.sanction_date}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 text-[11px] block">Executing Agency</span>
              <span className="font-semibold text-slate-800">{work.executing_agency}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 text-[11px] block">Contractor / Vendor</span>
              <span className="font-bold text-blue-700">{work.vendor}</span>
            </div>
          </div>
        </div>

        {/* Risk Score Multi-Signal Panel */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Multi-Signal Risk Score Panel
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">5 Independent Detection Engines</span>
            </div>

            {/* Signal Breakdown Bars */}
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-slate-700">1. Price Benchmarking (GeM External Reference)</span>
                  <span className="text-red-600 font-mono">{risk.price_score} / 100 <span className="text-slate-400 font-normal">({risk.price_weight}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${risk.price_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-slate-700">2. Statistical IQR Outlier (District Cohort)</span>
                  <span className="text-red-600 font-mono">{risk.iqr_score} / 100 <span className="text-slate-400 font-normal">({risk.iqr_weight}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${risk.iqr_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-slate-700">3. Benford's Law Anomaly (Leading Digit)</span>
                  <span className="text-amber-600 font-mono">{risk.benford_score} / 100 <span className="text-slate-400 font-normal">({risk.benford_weight}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${risk.benford_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-slate-700">4. Vendor Concentration (HHI Market Share)</span>
                  <span className="text-amber-600 font-mono">{risk.hhi_score} / 100 <span className="text-slate-400 font-normal">({risk.hhi_weight}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${risk.hhi_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-slate-700">5. Photo & Geo Similarity (Perceptual Hash)</span>
                  <span className="text-red-600 font-mono">{risk.photo_score} / 100 <span className="text-slate-400 font-normal">({risk.photo_weight}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${risk.photo_score}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-medium">
            <span className="font-bold">Principle: </span>
            {risk.disclaimer}
          </div>
        </div>
      </div>

      {/* Row 3: 4 Evidence Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Evidence Card 1: Price Benchmarking */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">1. Price Benchmarking</span>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800">High Variance</span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-1 my-2">
              <div>Observed Unit: <span className="font-bold text-slate-900">₹18,500</span></div>
              <div>GeM Reference: <span className="font-bold text-slate-900">₹11,200</span></div>
              <div>Variance: <span className="font-bold text-red-600">+65.2%</span></div>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Extracted LED street lighting exceeds external reference price.
            </p>
          </div>
          <button
            onClick={() => onNavigate(`/works/${work.work_code}/evidence`)}
            className="w-full mt-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-slate-200 transition text-center"
          >
            View Evidence
          </button>
        </div>

        {/* Evidence Card 2: IQR Outlier */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">2. IQR Outlier</span>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800">Elevated Risk</span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-1 my-2">
              <div>Observed: <span className="font-bold text-slate-900 font-mono">₹21,50,000</span></div>
              <div>District Median: <span className="font-bold text-slate-900 font-mono">₹14,50,000</span></div>
              <div>Upper Bound: <span className="font-bold text-slate-900 font-mono">₹18,20,000</span></div>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Expenditure exceeds upper interquartile threshold for community buildings.
            </p>
          </div>
          <button
            onClick={() => onNavigate(`/works/${work.work_code}/evidence`)}
            className="w-full mt-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-slate-200 transition text-center"
          >
            View Evidence
          </button>
        </div>

        {/* Evidence Card 3: Benford's Law */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">3. Benford's Law</span>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Deviation</span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-1 my-2">
              <div>MAD Score: <span className="font-bold text-slate-900 font-mono">0.0210</span></div>
              <div>Leading Digits: <span className="font-bold text-amber-700">Abnormal 3 & 4</span></div>
              <div>Expected P(1): <span className="font-bold text-slate-700">30.1% vs 18.2%</span></div>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Empirical transaction leading-digit frequencies deviate from natural logarithmic curve.
            </p>
          </div>
          <button
            onClick={() => onNavigate(`/works/${work.work_code}/evidence`)}
            className="w-full mt-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-slate-200 transition text-center"
          >
            View Evidence
          </button>
        </div>

        {/* Evidence Card 4: Vendor HHI */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">4. Vendor Concentration</span>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800">HHI 3120</span>
            </div>
            <div className="text-[11px] text-slate-600 space-y-1 my-2">
              <div>District HHI: <span className="font-bold text-red-600">3,120 (&gt;2500)</span></div>
              <div>Vendor Share: <span className="font-bold text-slate-900">48.2% of District</span></div>
              <div>Market State: <span className="font-bold text-slate-700">High Concentration</span></div>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Single contractor commands disproportionate share of sanctioned constituency funds.
            </p>
          </div>
          <button
            onClick={() => onNavigate(`/works/${work.work_code}/evidence`)}
            className="w-full mt-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-slate-200 transition text-center"
          >
            View Evidence
          </button>
        </div>
      </div>

      {/* Row 4: Timeline, Documents & Human Review Decision Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Timeline & Documents */}
        <div className="lg:col-span-6 space-y-5">
          {/* Work Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Implementation Timeline</h3>
            <div className="space-y-4 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(work?.timeline || []).map((event, idx) => (
                <div key={idx} className="flex items-start gap-4 relative">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10 ${
                    event.status === 'flagged' ? 'bg-red-500 ring-4 ring-red-100' :
                    event.status === 'active' ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-emerald-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{event.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{event.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{event.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents & Photos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Documents & Geo-Tagged Photographs</h3>
            <div className="grid grid-cols-2 gap-3">
              {(work?.documents || []).map((doc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800 truncate">{doc.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>{doc.type}</span>
                    <span>{doc.size || `${doc.count} photos`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Human Review Decision Form */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Human Audit & Review Workflow</h3>
                <p className="text-xs text-slate-500">Record official assessment with mandatory justification notes</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                {work.review_case.status}
              </span>
            </div>

            {submitSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Decision submitted and committed immutably to audit trail!</span>
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Reviewer Name</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Official Decision</label>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Comment & Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter detailed audit findings (e.g., field inspection report, vendor explanation for price variance, or reason for escalation)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Acting as <span className="font-bold text-slate-700">{currentUserRole}</span>
                </span>
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Decision & Commit to Audit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
