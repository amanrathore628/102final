import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  AlertTriangle,
  Building,
  MapPin,
  Clock,
  Download,
  Eye,
  FileText,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { getReportTypes, getRecentReports, generateReport, API_BASE } from '../services/api';

export const Reports: React.FC = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [exportFormat, setExportFormat] = useState('CSV');
  const [downloadUrl, setDownloadUrl] = useState('');

  // Filter selection
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedYear, setSelectedYear] = useState('2024-25');
  const [dateRange, setDateRange] = useState('2024-05-15');

  useEffect(() => {
    async function load() {
      try {
        const [tData, rData] = await Promise.all([getReportTypes(), getRecentReports()]);
        setTypes(tData.types || []);
        setRecent(rData.reports || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      }
    }
    load();
  }, []);

  const handleGenerate = async (typeName: string) => {
    try {
      setGenerating(typeName);
      setErrorMsg('');
      const res = await generateReport({
        report_type: typeName,
        format: exportFormat,
        state: selectedState !== 'All India' ? selectedState : undefined,
        district: selectedDistrict !== 'All Districts' ? selectedDistrict : undefined,
        financial_year: selectedYear,
        date_range: dateRange,
      });
      setSuccessMsg(`Generated ${res.report_name} (${res.record_count} records)`);
      setDownloadUrl(res.download_url);
      // Reload recent
      const rData = await getRecentReports();
      setRecent(rData.reports || []);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'risk': return AlertTriangle;
      case 'vendor': return Building;
      case 'district': return MapPin;
      case 'audit': return Clock;
      default: return Briefcase;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Reports Center</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Generate evidence-backed official MPLADS monitoring, risk and audit reports</p>
        </div>

        <label className="text-xs text-slate-500 font-medium">Export format
          <select aria-label="Export format" className="ml-2 border border-slate-200 p-2 rounded-lg" value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
            <option>CSV</option><option>JSON</option><option>PDF</option>
          </select>
        </label>
      </div>

      {errorMsg && <p role="alert" className="text-red-600 text-sm">{errorMsg}</p>}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
          <a href={downloadUrl} download className="ml-auto underline font-bold">Download report</a>
        </div>
      )}

      {/* Main Grid: 5 Report Generator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {types.map((t) => {
          const Icon = getIcon(t.id);
          const isGeneratingThis = generating === t.name;

          return (
            <div
              key={t.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{t.name}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">Official Executive Dossier</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600">{t.description}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">Since:</span>
                  <input
                    type="date"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                  />
                </div>

                <button
                  onClick={() => handleGenerate(t.name)}
                  disabled={isGeneratingThis}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isGeneratingThis ? 'Compiling Report...' : 'Generate Report'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Generated Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Generated Reports Archive</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">Report Title</th>
                <th className="py-2.5 px-3.5">Generated By</th>
                <th className="py-2.5 px-3.5">Date</th>
                <th className="py-2.5 px-3.5">Format</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recent.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Generate a report above to create your first saved export.</td></tr>}
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-bold text-slate-900">{r.name}</td>
                  <td className="py-3 px-3.5 text-slate-600">{r.generated_by}</td>
                  <td className="py-3 px-3.5 font-mono text-slate-500">{r.date}</td>
                  <td className="py-3 px-3.5 text-slate-700 font-semibold">{r.format}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={() => window.open(r.download_url, '_blank')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
