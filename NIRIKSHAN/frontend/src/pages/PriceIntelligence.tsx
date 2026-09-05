import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Tag,
  TrendingUp,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight,
  Search,
} from 'lucide-react';
import { getPriceStats, getPriceDistribution, getPriceBenchmarks } from '../services/api';
import { formatINR } from '../utils/formatters';

interface PriceIntelligenceProps {
  onNavigate: (route: string) => void;
}

export const PriceIntelligence: React.FC<PriceIntelligenceProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [statsData, distData, benchData] = await Promise.all([
          getPriceStats(),
          getPriceDistribution(),
          getPriceBenchmarks({ search: search || undefined }),
        ]);
        setStats(statsData);
        setDistribution(distData.distribution || []);
        setBenchmarks(benchData.items || []);
        if (benchData.items?.length > 0 && !selectedItem) {
          setSelectedItem(benchData.items[0]);
        }
      } catch (err) {
        console.error('Failed to load price intelligence:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Price Intelligence</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">GeM-anchored itemizable procurement benchmarking, fuzzy matching and variance distribution</p>
        </div>

        <button
          onClick={() => window.open('/api/reports/download?type=PriceBenchmark&format=CSV', '_blank')}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Price Benchmarks</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items Analyzed</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats?.items_analyzed ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-medium">Matched across GeM catalog</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Average Price Variance</span>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {stats?.average_variance_pct !== undefined ? (stats.average_variance_pct > 0 ? `+${stats.average_variance_pct}%` : `${stats.average_variance_pct}%`) : '0.0%'}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Moderate deviation band</span>
        </div>

        <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Over-Benchmarked Exposure</span>
          <div className="text-2xl font-black text-orange-900 mt-1">₹{stats?.over_benchmarked_expenditure_cr ?? 0} Cr</div>
          <span className="text-[11px] text-orange-700 font-medium">Exceeds reference pricing</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">High Variance Items</span>
          <div className="text-2xl font-black text-rose-900 mt-1">{stats?.high_variance_items_count ?? 0}</div>
          <span className="text-[11px] text-rose-700 font-medium">&gt; 30% above GeM reference</span>
        </div>
      </div>

      {/* Price Variance Distribution Curve */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Price Variance Distribution (Bell Curve)</h2>
            <p className="text-[11px] text-slate-500">MPLADS recorded item unit price variance vs GeM external reference catalog</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Savings / At Par</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Normal Tolerance</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Anomaly / High Variance</span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="variance_pct" unit="%" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              <Area type="monotone" dataKey="frequency" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.25} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Split View: Benchmark Table + Item Selection Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Benchmark Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">GeM Price Benchmark Table</h3>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter benchmark catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Item Name</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5 text-right">MPLADS Price</th>
                  <th className="py-2.5 px-3.5 text-right">GeM Ref Price</th>
                  <th className="py-2.5 px-3.5 text-right">Variance %</th>
                  <th className="py-2.5 px-3.5 text-center">Confidence</th>
                  <th className="py-2.5 px-3.5 text-center">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {benchmarks.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/70 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3.5 text-slate-900">{item.item_name}</td>
                      <td className="py-3 px-3.5 text-slate-600">{item.category}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">{formatINR(item.mplads_price)}</td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-600">{formatINR(item.gem_reference_price)}</td>
                      <td className={`py-3 px-3.5 text-right font-bold ${
                        item.variance_pct > 20 ? 'text-rose-600' : item.variance_pct < 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {item.variance_pct > 0 ? `+${item.variance_pct}%` : `${item.variance_pct}%`}
                      </td>
                      <td className="py-3 px-3.5 text-center text-blue-700 font-bold">{item.match_confidence}%</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.risk === 'High' ? 'bg-red-100 text-red-800' :
                          item.risk === 'Moderate' ? 'bg-amber-100 text-amber-800' :
                          item.risk === 'Savings' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.risk}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Showing {benchmarks.length} benchmark items
          </div>
        </div>

        {/* Right: Selected Item Details Drawer */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {selectedItem ? (
            <>
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Item Selection Receipt</span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">{selectedItem.item_name}</h2>
                <span className="text-xs text-slate-500">{selectedItem.category} ({selectedItem.unit})</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>MPLADS Recorded Price:</span>
                    <strong className="text-red-600 font-mono text-sm">{formatINR(selectedItem.mplads_price)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GeM Benchmark Rate:</span>
                    <strong className="text-slate-900 font-mono">{formatINR(selectedItem.gem_reference_price)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Absolute Cost Difference:</span>
                    <strong className="text-red-700 font-mono">{formatINR(selectedItem.difference)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span>Percentage Variance:</span>
                    <strong className="text-red-600 font-bold">+{selectedItem.variance_pct}%</strong>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Fuzzy Match Confidence</span>
                    <span>{selectedItem.match_confidence}% Match</span>
                  </div>
                  <p className="text-slate-600">
                    Matched using rapidfuzz token similarity algorithm against GeM reference catalog.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Related Highlight Work</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-slate-900 font-mono">{selectedItem.related_work}</span>
                    <button
                      onClick={() => onNavigate(`/works/${selectedItem.related_work}`)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition"
                    >
                      Inspect Case
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Note: Price benchmarking applies to itemizable goods. Legitimate variances may exist due to local freight, terrain conditions, or installation services.
              </p>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">Select an item from the table</div>
          )}
        </div>
      </div>
    </div>
  );
};
