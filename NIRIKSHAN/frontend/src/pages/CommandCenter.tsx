import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Briefcase,
  IndianRupee,
  AlertTriangle,
  Clock,
  ArrowRight,
  Upload,
  Play,
  FileText,
  Inbox,
  LayoutDashboard,
  Landmark,
} from 'lucide-react';
import { KPICard } from '../components/common/KPICard';
import { RiskBadge } from '../components/common/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { ChartCard, DarkTooltip } from '../components/common/ChartCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { FilterBar } from '../components/common/FilterBar';
import { getDashboardStats, getDashboardCharts } from '../services/api';
import { formatINR } from '../utils/formatters';

interface CommandCenterProps {
  onNavigate: (route: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, chartsData] = await Promise.all([
        getDashboardStats({ state: selectedState || undefined }),
        getDashboardCharts(),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not connect to the backend. Ensure the API server is running.');
    } finally {
      setLoading(false);
    }
  }, [selectedState]);

  // Only re-fetch when selectedState changes — not on every render
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Legend items from live data ───────────────────────────────────────────
  const riskLegend = Array.isArray(charts?.risk_distribution)
    ? charts.risk_distribution.map((d: any) => ({
        label: d.name,
        color: d.color,
        pct: stats?.total_works
          ? ((d.value / stats.total_works) * 100).toFixed(1)
          : '—',
      }))
    : [];

  // ── Fund utilization bars (resilient to array or object payload) ───────────
  const fundUtilizationBars: Array<{ label: string; display: string; pct: number; color: string }> =
    Array.isArray(charts?.fund_utilization)
      ? charts.fund_utilization
      : charts?.fund_utilization && typeof charts.fund_utilization === 'object'
      ? [
          {
            label: 'Total Central Allocation',
            display: `₹${(charts.fund_utilization.allocated_cr ?? 0).toLocaleString()} Cr`,
            pct: 100,
            color: '#2563EB',
          },
          {
            label: 'Released by Authorities',
            display: `₹${(charts.fund_utilization.released_cr ?? 0).toLocaleString()} Cr`,
            pct: 100,
            color: '#10B981',
          },
          {
            label: 'Utilized on Field',
            display: `₹${(charts.fund_utilization.utilized_cr ?? 0).toLocaleString()} Cr`,
            pct: Number(charts.fund_utilization.utilization_rate_pct ?? 0),
            color: '#F59E0B',
          },
          {
            label: 'Unspent Balance',
            display: `₹${(charts.fund_utilization.balance_cr ?? 0).toLocaleString()} Cr`,
            pct: Math.max(0, 100 - Number(charts.fund_utilization.utilization_rate_pct ?? 0)),
            color: '#94A3B8',
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <PageHeader
        title="Command Center"
        subtitle="MPLADS Portfolio Intelligence & Multi-Signal Oversight"
        icon={LayoutDashboard}
        badge="DEMO DATA"
        badgeColor="emerald"
        actions={
          <FilterBar
            dynamic
            filters={[
              {
                key: 'state',
                label: 'State',
                dynamicKey: 'states',
                value: selectedState,
                allLabel: 'All India',
                onChange: setSelectedState,
              },
            ]}
          />
        }
      />

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {error && !loading && (
        <ErrorState
          title="Dashboard data unavailable"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState variant="cards" cards={5} />
      ) : (
        !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              title="Total Works"
              value={stats?.total_works ? stats.total_works.toLocaleString('en-IN') : '—'}
              subtitle={selectedState ? `in ${selectedState}` : 'all states'}
              icon={Briefcase}
            />
            <KPICard
              title="Total Expenditure"
              value={
                stats?.total_expenditure_cr != null
                  ? `₹${Number(stats.total_expenditure_cr).toLocaleString('en-IN')} Cr`
                  : '—'
              }
              icon={IndianRupee}
            />
            <KPICard
              title="Flagged Works"
              value={stats?.flagged_works ? stats.flagged_works.toLocaleString('en-IN') : '0'}
              subtitle={
                stats?.total_works && stats?.flagged_works
                  ? `${((stats.flagged_works / stats.total_works) * 100).toFixed(1)}% of total`
                  : undefined
              }
              variant="warning"
            />
            <KPICard
              title="High Risk Works"
              value={stats?.high_risk_works ? stats.high_risk_works.toLocaleString('en-IN') : '0'}
              subtitle={
                stats?.total_works && stats?.high_risk_works
                  ? `${((stats.high_risk_works / stats.total_works) * 100).toFixed(1)}% of total`
                  : undefined
              }
              variant="alert"
            />
            <KPICard
              title="Pending Reviews"
              value={stats?.pending_reviews ?? '—'}
              variant="warning"
              icon={Clock}
            />
          </div>
        )
      )}

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Flagged Works Over Time */}
            <ChartCard
              title="Flagged Works Over Time"
              subtitle="Monthly trend of flagged and high-risk works"
              badge="17 Months"
              className="lg:col-span-5"
              chartHeight="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.time_series || []} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  />
                  <Line type="monotone" dataKey="flagged"   name="Flagged"   stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2.5, fill: '#2563EB' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="high_risk" name="High Risk" stroke="#EF4444" strokeWidth={2}   dot={{ r: 2.5, fill: '#EF4444' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Risk Distribution Donut */}
            <ChartCard
              title="Risk Distribution"
              subtitle="Portfolio breakdown by risk tier"
              className="lg:col-span-3"
              chartHeight="h-64"
            >
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.risk_distribution || []}
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {(charts?.risk_distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Live legend from data */}
              {riskLegend.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-2 border-t border-slate-100 mt-2">
                  {riskLegend.map((l: any) => (
                    <div key={l.label} className="flex items-center gap-1.5 p-1 rounded bg-slate-50">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                      <span className="text-slate-700 truncate font-semibold">{l.label} ({l.pct}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Risk Signal Breakdown */}
            <ChartCard
              title="Risk Signal Breakdown"
              subtitle="Independent detection engine flags"
              className="lg:col-span-4"
              chartHeight="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts?.signal_breakdown || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="signal"
                    tick={{ fontSize: 9, fill: '#64748B', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" name="Flagged Works" radius={[4, 4, 0, 0]}>
                    {(charts?.signal_breakdown || []).map((entry: any, index: number) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Priority Reviews + Quick Access ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Priority Reviews */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Priority Reviews Requiring Attention</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Highest composite risk cases prioritised for human audit</p>
                </div>
                <button
                  onClick={() => onNavigate('/review-queue')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition shrink-0"
                >
                  View All ({stats?.pending_reviews ?? '—'})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3">Work / Code</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Vendor</th>
                      <th className="py-2.5 px-3">Signals</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(charts?.priority_reviews || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                          No high-risk works in current filter scope.
                        </td>
                      </tr>
                    ) : (
                      (charts?.priority_reviews || []).map((item: any) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition cursor-pointer"
                          onClick={() => onNavigate(`/works/${item.work_code}`)}
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] text-white ${
                                item.risk_score >= 80 ? 'bg-red-600' : 'bg-amber-500'
                              }`}
                            >
                              {item.risk_score}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 line-clamp-1 max-w-[220px]" title={item.work_name}>
                              {item.work_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.work_code}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{item.district}, {item.state}</td>
                          <td className="py-3 px-3 text-slate-700 font-semibold truncate max-w-[150px]" title={item.vendor}>
                            {item.vendor}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {(item.signals || '').split('+').map((s: string, idx: number) => (
                                <span key={idx} className="text-[10px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                                  {s.trim()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); onNavigate(`/works/${item.work_code}`); }}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-[11px] font-bold border border-blue-200 transition"
                            >
                              Investigate
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Access + System Status */}
            <div className="lg:col-span-4 space-y-4">
              {/* Quick Access */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Access</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Official Data',    icon: Landmark, route: '/official-data',     color: 'text-indigo-600' },
                    { label: 'Upload Data',      icon: Upload,   route: '/ingestion',        color: 'text-blue-600' },
                    { label: 'Run Analysis',     icon: Play,     route: '/risk-analysis',    color: 'text-amber-600' },
                    { label: 'Review Queue',     icon: Inbox,    route: '/review-queue',     color: 'text-purple-600' },
                    { label: 'Reports',          icon: FileText, route: '/reports',          color: 'text-emerald-600' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.route}
                        id={`quick-${item.route.replace('/', '')}`}
                        onClick={() => onNavigate(item.route)}
                        className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 transition"
                      >
                        <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">System Engine Status</h3>
                <div className="space-y-2 text-xs">
                  {[
                    'eSAKSHI & GeM Demo Fixtures',
                    'GeM Price Benchmarking Engine',
                    'Statistical IQR Outlier Engine',
                    'Photo & Perceptual Hashing Engine',
                    'Audit Trail Ledger Database',
                  ].map((engine, i) => (
                    <div key={i} className={`flex items-center justify-between py-1 ${i < 4 ? 'border-b border-slate-100' : ''}`}>
                      <span className="text-slate-600 truncate">{engine}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 shrink-0 ml-2">
                        Operational
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Fund Utilization + Top Vendors ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top Risky Vendors */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900">Top Risky Vendors</h2>
                <p className="text-[11px] text-slate-500">Elevated HHI concentration &amp; benchmark variance</p>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-y border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Vendor</th>
                    <th className="py-2 px-3 text-center">Works</th>
                    <th className="py-2 px-3 text-right">Expenditure</th>
                    <th className="py-2 px-3 text-center">Avg Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(charts?.top_vendors || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[11px] text-slate-400">No vendor data available.</td>
                    </tr>
                  ) : (
                    (charts?.top_vendors || []).map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[140px]">{v.name}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{v.works_count}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          ₹{v.expenditure_cr} Cr
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              v.risk_score >= 80
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {v.risk_score}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Fund Utilization Bars */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">MPLADS Fund Utilization</h2>
                  <p className="text-[11px] text-slate-500">Central allocation vs release vs field utilization</p>
                </div>
                {stats?.utilization_pct != null && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 shrink-0">
                    {stats.utilization_pct.toFixed(1)}% Utilized
                  </span>
                )}
              </div>

              <div className="space-y-4 py-2">
                {fundUtilizationBars.map((bar: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">{bar.label}</span>
                      <span className="text-slate-900 font-mono">{bar.display}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${bar.pct}%`, background: bar.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Utilization Alert Pills */}
              {Array.isArray(charts?.utilization_alerts) && charts.utilization_alerts.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px] mt-2">
                  {charts.utilization_alerts.map((a: any, i: number) => (
                    <div key={i} className={`p-2 rounded border text-center font-semibold ${a.style}`}>
                      {a.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
