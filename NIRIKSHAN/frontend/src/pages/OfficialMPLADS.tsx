import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileCheck2,
  IndianRupee,
  Landmark,
  Search,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { API_BASE, getOfficialComparison, getOfficialMPs, getOfficialStates, getOfficialSummary } from '../services/api';

const moneyCr = (value: number) => `₹${(Number(value || 0) / 10_000_000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
const pct = (value: number) => `${Number(value || 0).toFixed(1)}%`;

function MetricCard({ title, value, note, icon: Icon, tone = 'blue' }: any) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">{note}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, note, color }: any) {
  return (
    <div>
      <div className="flex justify-between gap-4 text-xs font-semibold">
        <span className="text-slate-700">{label}</span>
        <span className="font-mono text-slate-900">{pct(value)}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{note}</p>
    </div>
  );
}

export const OfficialMPLADS: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [states, setStates] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [mps, setMps] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, total_pages: 1, total_items: 0 });
  const [state, setState] = useState('');
  const [house, setHouse] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = { state: state || undefined, house: house || undefined };
      const [summaryData, stateData, mpData, comparisonData] = await Promise.all([
        getOfficialSummary(filters),
        getOfficialStates(house || undefined),
        getOfficialMPs({ ...filters, search: query || undefined, page, limit: 20 }),
        getOfficialComparison(),
      ]);
      setSummary(summaryData);
      setStates(stateData.states || []);
      setMps(mpData.items || []);
      setPagination(mpData.pagination || {});
      setComparison(comparisonData);
    } catch (err) {
      console.error(err);
      setError('The official MPLADS snapshot could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [state, house, query, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const chartData = useMemo(() => states.slice(0, 10).map((row) => ({
    state: row.state,
    expenditure: Number((row.expenditure / 10_000_000).toFixed(2)),
    recommended: Number((row.recommended_amount / 10_000_000).toFixed(2)),
  })), [states]);

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  if (loading && !summary) return <LoadingState variant="cards" cards={6} />;
  if (error && !summary) return <ErrorState title="Official data unavailable" message={error} onRetry={loadData} />;

  const s = summary?.summary || {};
  return (
    <div className="space-y-6">
      <PageHeader
        title="Official MPLADS Portfolio"
        subtitle="MP-level allocation, recommendation, expenditure and delivery snapshot"
        icon={Landmark}
        badge="OFFICIAL SNAPSHOT"
        badgeColor="blue"
        actions={
          <a href={`${API_BASE}/official/download`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
            <Download className="w-3.5 h-3.5" /> Download CSV
          </a>
        }
      />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Database className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-blue-950">Official portfolio baseline • 03 September 2026</p>
          <p className="mt-1 text-[11px] leading-5 text-blue-800">
            This view reads the supplied official MP summary directly. It supports national, state and MP monitoring. Vendor, item-price, GPS, photo and duplicate checks remain in the NIRIKSHAN work-level demonstration because those fields are absent from this export.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <MetricCard title="MP records" value={Number(s.total_mps || 0).toLocaleString('en-IN')} note={`${s.states_uts || 0} states / UTs`} icon={Users} />
        <MetricCard title="Allocated" value={moneyCr(s.allocated_amount)} note="MPLADS allocation" icon={IndianRupee} tone="indigo" />
        <MetricCard title="Recommended" value={moneyCr(s.recommended_amount)} note={`${pct(s.recommendation_utilization_pct)} of allocation`} icon={FileCheck2} tone="blue" />
        <MetricCard title="Expenditure" value={moneyCr(s.expenditure)} note={`${pct(s.expenditure_against_recommended_pct)} of recommended`} icon={Banknote} tone="emerald" />
        <MetricCard title="Completed works" value={Number(s.completed_works || 0).toLocaleString('en-IN')} note={`of ${Number(s.recommended_works || 0).toLocaleString('en-IN')} recommended`} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Unpaid balance" value={moneyCr(s.unpaid_balance)} note={`${Number(s.pending_payments || 0).toLocaleString('en-IN')} pending payments`} icon={AlertCircle} tone="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Portfolio delivery funnel</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Weighted ratios calculated from official totals</p>
          <div className="mt-5 space-y-5">
            <ProgressRow label="Recommended ÷ allocated" value={s.recommendation_utilization_pct} note="This is the official export's utilization definition." color="#2563EB" />
            <ProgressRow label="Expenditure ÷ recommended" value={s.expenditure_against_recommended_pct} note="Tracks spending against MP recommendations." color="#4F46E5" />
            <ProgressRow label="Completed ÷ recommended works" value={s.completion_rate_pct} note="Completion across the filtered MP portfolio." color="#10B981" />
            <ProgressRow label="Successful ÷ all payments" value={s.payment_success_rate_pct} note={`${Number(s.successful_payments || 0).toLocaleString('en-IN')} successful transactions.`} color="#059669" />
          </div>
        </div>

        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Leading states by expenditure</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Recommended and spent amounts in ₹ crore; house filter applies</p>
          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="state" tick={{ fontSize: 9, fill: '#64748B' }} angle={-28} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')} Cr`]} />
                <Bar dataKey="recommended" name="Recommended" fill="#A5B4FC" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenditure" name="Expenditure" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">MP portfolio explorer</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Operational attention labels use delivery and payment backlog only; they are not fraud findings.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option value="">All states / UTs</option>
              {(summary?.filters?.states || []).map((name: string) => <option key={name}>{name}</option>)}
            </select>
            <select value={house} onChange={(e) => { setHouse(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option value="">All houses</option>
              {(summary?.filters?.houses || []).map((name: string) => <option key={name}>{name}</option>)}
            </select>
            <form onSubmit={applySearch} className="flex">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="MP, constituency or state" className="w-52 rounded-l-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400" />
              <button className="rounded-r-lg bg-slate-900 px-3 text-white" aria-label="Search"><Search className="w-3.5 h-3.5" /></button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-3 py-2.5">MP / constituency</th><th className="px-3 py-2.5">House</th><th className="px-3 py-2.5 text-right">Allocated</th><th className="px-3 py-2.5 text-right">Recommended</th><th className="px-3 py-2.5 text-right">Expenditure</th><th className="px-3 py-2.5 text-center">Completion</th><th className="px-3 py-2.5">Delivery attention</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mps.map((row) => {
                const reasons = [];
                if (row.recommended_amount > 0 && row.unpaid_balance / row.recommended_amount >= 0.5) reasons.push('High unpaid balance');
                if (row.recommended_works > 0 && row.completion_rate_pct < 25) reasons.push('Low completion');
                if (row.pending_payments > 0) reasons.push(`${row.pending_payments} payment${row.pending_payments === 1 ? '' : 's'} pending`);
                return (
                  <tr key={`${row.mp_name}-${row.constituency}-${row.house}`} className="hover:bg-slate-50">
                    <td className="px-3 py-3"><div className="font-bold text-slate-900">{row.mp_name}</div><div className="text-[10px] text-slate-500">{row.constituency} • {row.state}</div></td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{row.house}</td>
                    <td className="px-3 py-3 text-right font-mono">{moneyCr(row.allocated_amount)}</td>
                    <td className="px-3 py-3 text-right font-mono">{moneyCr(row.recommended_amount)}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">{moneyCr(row.expenditure)}</td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-slate-800">{pct(row.completion_rate_pct)}</span><div className="text-[10px] text-slate-400">{row.completed_works}/{row.recommended_works}</div></td>
                    <td className="px-3 py-3 min-w-44">{reasons.length ? <div className="flex flex-wrap gap-1">{reasons.map((reason) => <span key={reason} className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">{reason}</span>)}</div> : <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">On track</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span>{Number(pagination.total_items || 0).toLocaleString('en-IN')} matching MP records</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-slate-200 p-1.5 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <span className="font-semibold">Page {page} of {pagination.total_pages || 1}</span>
            <button disabled={page >= (pagination.total_pages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded border border-slate-200 p-1.5 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {comparison && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Official layer • {comparison.official.records} records</p><h3 className="mt-1 text-sm font-bold text-blue-950">Portfolio oversight</h3><p className="mt-2 text-xs leading-5 text-blue-900">{comparison.official.grain}. Covers {comparison.official.coverage.join(', ')}.</p></div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">NIRIKSHAN demo • {comparison.nirikshan_demo.records} works</p><h3 className="mt-1 text-sm font-bold text-violet-950">Evidence-led investigation</h3><p className="mt-2 text-xs leading-5 text-violet-900">{comparison.nirikshan_demo.grain}. Covers {comparison.nirikshan_demo.coverage.join(', ')}.</p></div>
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">How the two layers work together</h3><ul className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">{comparison.integration.map((item: string) => <li key={item} className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">{item}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
};
