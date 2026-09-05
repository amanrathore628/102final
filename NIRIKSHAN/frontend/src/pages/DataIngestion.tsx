import React, { useEffect, useState } from 'react';
import {
  Upload,
  Cloud,
  Landmark,
  ShoppingCart,
  Camera,
  Play,
  CheckCircle,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { getIngestionSources, getIngestionLogs, triggerNormalization, triggerAnomalyAnalysis, API_BASE } from '../services/api';

export const DataIngestion: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [datasetType, setDatasetType] = useState('eSAKSHI CSV');
  const [uploading, setUploading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      const [sData, lData] = await Promise.all([getIngestionSources(), getIngestionLogs()]);
      setSources(sData.sources || []);
      setLogs(lData.logs || []);
    } catch (err) {
      console.error('Failed to load ingestion data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('dataset_type', datasetType);

      const res = await fetch(`${API_BASE}/ingestion/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 5000);
      setUploadFile(null);
      loadData();
    } catch (err) {
      console.error('Failed to upload:', err);
      alert(err instanceof Error ? err.message : 'Upload failed. Please check the file.');
    } finally {
      setUploading(false);
    }
  };

  const handleRunPipeline = async () => {
    try {
      setPipelineRunning(true);
      await triggerNormalization();
      const result = await triggerAnomalyAnalysis();
      if (!result.success) throw new Error(result.errors.join('; '));
      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(''), 5000);
      loadData();
    } catch (err) {
      console.error('Pipeline error:', err);
      alert(err instanceof Error ? err.message : 'Pipeline failed');
    } finally {
      setPipelineRunning(false);
    }
  };

  const getSourceIcon = (id: string) => {
    switch (id) {
      case 'datagovin': return Landmark;
      case 'gem': return ShoppingCart;
      case 'photos': return Camera;
      default: return Cloud;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500 flex justify-between gap-4">
        <span>Local demo connectors use synthetic records. CSV/JSON uploads are stored on this device.</span>
        <a className="text-blue-600 font-bold" href="/api/prototype/sample.csv" download>Download sample CSV</a>
      </div>
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Data Ingestion Hub</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Automated synchronization with eSAKSHI, data.gov.in, GeM catalogs & site photograph hashing</p>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={pipelineRunning}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{pipelineRunning ? 'Recalculating 5 Engines...' : 'Trigger Multi-Signal Pipeline'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Row 1: Source Connectors Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((src) => {
          const Icon = getSourceIcon(src.id);
          return (
            <div key={src.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{src.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  {src.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Last Synchronized:</span>
                  <strong className="text-slate-700 font-mono">{src.last_sync}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Records Imported:</span>
                  <strong className="text-slate-900 font-mono">{src.records_imported?.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: File Upload Box & Pipeline Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* File Upload Box */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Manual Batch Upload</h2>

          <form onSubmit={handleFileUpload} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Dataset Schema Type</label>
              <select
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="eSAKSHI CSV">eSAKSHI Works Data (CSV / JSON)</option>
                <option value="GeM Catalog CSV">GeM Reference Price Catalog (CSV)</option>
                <option value="data.gov.in Budget">State Budget Release (CSV)</option>
                <option value="Site Photos ZIP">Geo-Tagged Work Photographs (ZIP / JPG)</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition bg-slate-50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                {uploadFile ? uploadFile.name : 'Select file or drag & drop (CSV, JSON, ZIP)'}
              </label>
              <p className="text-[10px] text-slate-400 mt-1">UTF-8 encoded standard format up to 50MB</p>
            </div>

            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow"
            >
              {uploading ? 'Validating Schema & Importing...' : 'Upload and Validate Dataset'}
            </button>
          </form>
        </div>

        {/* Pipeline Diagram */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Automated Ingestion & Scoring Pipeline
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">1</span>
                <div>
                  <div className="font-bold text-slate-900">Schema Ingestion & Parsing</div>
                  <div className="text-[10px] text-slate-500">Normalizes heterogeneous state & eSAKSHI data columns</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">2</span>
                <div>
                  <div className="font-bold text-slate-900">Fuzzy GeM Matching & Tokenization</div>
                  <div className="text-[10px] text-slate-500">Maps itemized descriptions against reference benchmark catalog</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">3</span>
                <div>
                  <div className="font-bold text-slate-900">Multi-Signal Detection Execution</div>
                  <div className="text-[10px] text-slate-500">Runs IQR Outliers, Benford 1st-Digit, HHI Concentration & pHash</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">4</span>
                <div>
                  <div className="font-bold text-slate-900">Composite Risk Aggregation</div>
                  <div className="text-[10px] text-slate-500">Emits auditable receipt scores & pushes cases into Review Queue</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Processing Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Batch Processing Logs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">Timestamp</th>
                <th className="py-2.5 px-3.5">Dataset</th>
                <th className="py-2.5 px-3.5 text-center">Records</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-center">Errors</th>
                <th className="py-2.5 px-3.5 text-center">Warnings</th>
                <th className="py-2.5 px-3.5">Log Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap">{l.timestamp}</td>
                  <td className="py-3 px-3.5 font-bold text-slate-900">{l.dataset}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-slate-800">{l.records}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono text-slate-600">{l.errors}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-amber-700 font-bold">{l.warnings}</td>
                  <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px] truncate max-w-[250px]">{l.log_text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
