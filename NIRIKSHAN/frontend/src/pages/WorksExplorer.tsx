import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  X,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { KPICard } from '../components/common/KPICard';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { getWorksList, API_BASE } from '../services/api';
import { formatINR } from '../utils/formatters';
import { WorkSummary } from '../types';

interface WorksExplorerProps {
  onNavigate: (route: string) => void;
  initialSearch?: string;
  initialDistrict?: string;
  initialRisk?: string;
}

export const WorksExplorer: React.FC<WorksExplorerProps> = ({
  onNavigate,
  initialSearch = '',
  initialDistrict = '',
  initialRisk = '',
}) => {
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total_items: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState(initialSearch);
  const [stateFilter, setStateFilter] = useState('All India');
  const [districtFilter, setDistrictFilter] = useState(initialDistrict || 'All Districts');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [riskFilter, setRiskFilter] = useState(initialRisk || 'All Risk Levels');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [vendorFilter, setVendorFilter] = useState('All Vendors');
  const [yearFilter, setYearFilter] = useState('2024-25');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [clearVersion, setClearVersion] = useState(0);

  const loadWorks = async (pageToLoad = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page: pageToLoad,
        limit: rowsPerPage,
        financial_year: yearFilter,
      };
      if (search) params.search = search;
      if (stateFilter !== 'All India') params.state = stateFilter;
      if (districtFilter !== 'All Districts') params.district = districtFilter;
      if (categoryFilter !== 'All Categories') params.category = categoryFilter;
      if (riskFilter !== 'All Risk Levels') params.risk = riskFilter;
      if (statusFilter !== 'All Statuses') params.status = statusFilter;
      if (vendorFilter !== 'All Vendors') params.vendor = vendorFilter;

      const data = await getWorksList(params);
      setWorks(data.items || []);
      setKpis(data.kpis);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load works:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorks(1);
  }, [stateFilter, districtFilter, categoryFilter, riskFilter, statusFilter, vendorFilter, yearFilter, rowsPerPage, clearVersion]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadWorks(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStateFilter('All India');
    setDistrictFilter('All Districts');
    setCategoryFilter('All Categories');
    setRiskFilter('All Risk Levels');
    setStatusFilter('All Statuses');
    setVendorFilter('All Vendors');
    setYearFilter('2024-25');
    setClearVersion(v => v + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Works Explorer</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Browse, filter and investigate all MPLADS works across states and constituencies</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open(API_BASE + '/reports/download?' + new URLSearchParams({
              type: 'WorksExplorer', format: 'CSV', search, state: stateFilter, district: districtFilter,
              category: categoryFilter, risk: riskFilter, status: statusFilter, vendor: vendorFilter
            }).toString(), '_blank')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Work ID, project name or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="md:col-span-8 flex flex-wrap items-center gap-2">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All India">State (All)</option>
              <option value="Bihar">Bihar</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>

            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Districts">District (All)</option>
              <option value="Rohtas">Rohtas</option>
              <option value="Banaskantha">Banaskantha</option>
              <option value="Jaipur">Jaipur</option>
              <option value="Patna">Patna</option>
              <option value="Pune">Pune</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Categories">Category (All)</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Community Building">Community Building</option>
              <option value="Energy">Energy</option>
              <option value="Education">Education</option>
              <option value="Roads">Roads</option>
              <option value="Water Supply">Water Supply</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Risk Levels">Risk Level (All)</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Statuses">Status (All)</option>
              <option value="Work in Progress">Work in Progress</option>
              <option value="Completed">Completed</option>
              <option value="Under Review">Under Review</option>
              <option value="Under Audit">Under Audit</option>
            </select>

            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Works</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.total_works || 1500}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Normal</span>
            <span className="text-emerald-600">▲ 1,250</span>
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.normal_works || 1250}</div>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>Flagged</span>
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">!</span>
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.flagged_works || 175}</div>
        </div>
        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
            <span>High Risk</span>
            <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-bold">50</span>
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.high_risk_works || 50}</div>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>Under Review</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[10px] font-bold">25</span>
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.under_review_works || 25}</div>
        </div>
      </div>

      {/* Main Works Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Showing</span>
            <span className="font-bold text-slate-900">{works.length}</span>
            <span className="text-slate-500 font-medium">of {pagination.total_items} results</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Rows per page:</span>
            {[25, 50, 100].map((size) => (
              <button
                key={size}
                onClick={() => setRowsPerPage(size)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                  rowsPerPage === size ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Priority</th>
                <th className="py-3 px-3.5">Work ID</th>
                <th className="py-3 px-3.5">Work Name</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">State</th>
                <th className="py-3 px-3.5">District</th>
                <th className="py-3 px-3.5">Vendor</th>
                <th className="py-3 px-3.5 text-right">Sanctioned</th>
                <th className="py-3 px-3.5 text-right">Expenditure</th>
                <th className="py-3 px-3.5 text-center">Risk Score</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(Array.isArray(works) ? works : []).map((w) => (
                <tr
                  key={w.id}
                  onClick={() => onNavigate(`/works/${w.work_code}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition"
                >
                  <td className="py-3 px-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      w.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                      w.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {w.priority}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{w.work_code}</td>
                  <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[200px] truncate">{w.work_name}</td>
                  <td className="py-3 px-3.5 text-slate-600">{w.category}</td>
                  <td className="py-3 px-3.5 text-slate-600">{w.state}</td>
                  <td className="py-3 px-3.5 text-slate-600">{w.district}</td>
                  <td className="py-3 px-3.5 text-slate-700 font-medium max-w-[140px] truncate">{w.vendor}</td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-800">{formatINR(w.sanctioned_amount)}</td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-900 font-bold">{formatINR(w.expenditure)}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold text-white ${
                      w.risk_score >= 80 ? 'bg-red-600' : w.risk_score >= 50 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}>
                      {w.risk_score}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="py-3 px-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onNavigate(`/works/${w.work_code}`)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-[11px] font-bold border border-blue-200 transition inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Page <span className="font-bold text-slate-800">{pagination.page}</span> of{' '}
            <span className="font-bold text-slate-800">{pagination.total_pages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadWorks(pagination.page - 1)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-100 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => loadWorks(pagination.page + 1)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-100 transition flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
