import React, { useEffect, useState } from 'react';
import {
  Copy,
  MapPin,
  Camera,
  Layers,
  ArrowRight,
  Download,
  AlertTriangle,
  CheckCircle,
  ScanEye,
  Crosshair,
  Maximize2,
} from 'lucide-react';
import { getDuplicateStats, getDuplicatePairs } from '../services/api';
import { formatINR } from '../utils/formatters';
import { DuplicatePairItem } from '../types';

interface DuplicateDetectionProps {
  onNavigate: (route: string) => void;
}

export const DuplicateDetection: React.FC<DuplicateDetectionProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [pairs, setPairs] = useState<DuplicatePairItem[]>([]);
  const [selectedPair, setSelectedPair] = useState<DuplicatePairItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, pairsData] = await Promise.all([
          getDuplicateStats(),
          getDuplicatePairs(),
        ]);
        setStats(statsData);
        setPairs(pairsData.pairs || []);
        if (pairsData.pairs?.length > 0) {
          setSelectedPair(pairsData.pairs[0]);
        }
      } catch (err) {
        console.error('Failed to load duplicate detection:', err);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Duplicate Detection Studio</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Multi-signal perceptual image hashing, geographic proximity, and project text duplication analysis</p>
        </div>

        <button
          onClick={() => window.open('/api/reports/download?type=Duplicates&format=CSV', '_blank')}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Duplicate Pairs (CSV)</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Potential Duplicate Pairs</span>
          <div className="text-2xl font-black text-amber-950 mt-1">{stats?.potential_duplicate_pairs ?? 0}</div>
          <span className="text-[11px] text-amber-700 font-medium">Flagged across portfolio</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">High Confidence Matches</span>
          <div className="text-2xl font-black text-rose-950 mt-1">{stats?.high_confidence_matches ?? 0}</div>
          <span className="text-[11px] text-rose-700 font-medium">&gt; 80% photo & geo match</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Photos Processed</span>
          <div className="text-2xl font-black text-emerald-950 mt-1">{stats?.photos_processed?.toLocaleString('en-IN') ?? 0}</div>
          <span className="text-[11px] text-emerald-700 font-medium">pHash / dHash 64-bit</span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Works Compared</span>
          <div className="text-2xl font-black text-blue-950 mt-1">{stats?.works_compared?.toLocaleString('en-IN') ?? 0}</div>
          <span className="text-[11px] text-blue-700 font-medium">Cross-constituency matrix</span>
        </div>
      </div>

      {/* Main Forensic Comparison Panel */}
      {selectedPair && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          {/* Comparison Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Work A Card */}
            <div className="md:col-span-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">WORK A</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{selectedPair.work_a.work_code}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs truncate">{selectedPair.work_a.project_name}</h3>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>District: <strong className="text-slate-800">{selectedPair.work_a.district}</strong></div>
                <div>Amount: <strong className="text-slate-900 font-mono">{formatINR(selectedPair.work_a.sanctioned_amount)}</strong></div>
                <div>Sanction Date: <strong className="text-slate-700">{selectedPair.work_a.sanction_date}</strong></div>
              </div>
            </div>

            {/* Center Multi-Signal Scores */}
            <div className="md:col-span-4 text-center space-y-2 py-2">
              <div className="text-xs font-bold text-slate-700">
                Photo Similarity: <span className="text-rose-600 font-black">{selectedPair.photo_similarity_pct}% [High Match]</span>
              </div>
              <div className="text-xs font-bold text-slate-700">
                Text Similarity: <span className="text-amber-600 font-black">{selectedPair.text_similarity_pct}% [Overlap]</span>
              </div>
              <div className="text-xs font-bold text-slate-700">
                Geographic Distance: <span className="text-rose-600 font-black">{selectedPair.geo_distance_m}m [Suspicious]</span>
              </div>

              <div className="pt-1">
                <span className="px-3.5 py-1 rounded-full bg-rose-600 text-white font-black text-xs shadow-md inline-flex items-center gap-1.5">
                  <ScanEye className="w-3.5 h-3.5" />
                  <span>Combined Confidence: {selectedPair.combined_confidence}</span>
                </span>
              </div>
            </div>

            {/* Work B Card */}
            <div className="md:col-span-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">WORK B</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{selectedPair.work_b.work_code}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs truncate">{selectedPair.work_b.project_name}</h3>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>District: <strong className="text-slate-800">{selectedPair.work_b.district}</strong></div>
                <div>Amount: <strong className="text-slate-900 font-mono">{formatINR(selectedPair.work_b.sanctioned_amount)}</strong></div>
                <div>Sanction Date: <strong className="text-slate-700">{selectedPair.work_b.sanction_date}</strong></div>
              </div>
            </div>
          </div>

          {/* Visual High-Res Images & GIS Evidence Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Photo A Preview with Real Photo */}
            <div className="md:col-span-4 bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-md flex flex-col relative group">
              <div className="p-2.5 bg-slate-900/90 text-white text-[11px] font-bold flex justify-between items-center z-10">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Site Photo A ({selectedPair.work_a.work_code})</span>
                </span>
                <span className="px-2 py-0.2 rounded bg-blue-600 text-[10px]">pHash Seed A</span>
              </div>
              <div className="relative h-56 overflow-hidden">
                <img
                  src={selectedPair.work_a.photo_url || "/photos/community_hall_1.jpg"}
                  alt="Site Photo A"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-4 inset-y-6 border-2 border-dashed border-rose-500/80 rounded-lg pointer-events-none flex items-start justify-end p-2">
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded shadow">Matched Substructure</span>
                </div>
              </div>
            </div>

            {/* Photo B Preview with Real Photo */}
            <div className="md:col-span-4 bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-md flex flex-col relative group">
              <div className="p-2.5 bg-slate-900/90 text-white text-[11px] font-bold flex justify-between items-center z-10">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Site Photo B ({selectedPair.work_b.work_code})</span>
                </span>
                <span className="px-2 py-0.2 rounded bg-rose-600 text-[10px]">{selectedPair.photo_similarity_pct}% Similar</span>
              </div>
              <div className="relative h-56 overflow-hidden">
                <img
                  src={selectedPair.work_b.photo_url || "/photos/community_hall_1.jpg"}
                  alt="Site Photo B"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-4 inset-y-6 border-2 border-dashed border-rose-500/80 rounded-lg pointer-events-none flex items-start justify-end p-2">
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded shadow">Matched Framing</span>
                </div>
              </div>
            </div>

            {/* Forensic Evidence Breakdown */}
            <div className="md:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between text-xs space-y-2">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-rose-600" />
                  <span>Forensic Analysis Output</span>
                </h4>
                <div className="space-y-2 text-[11px] text-slate-700">
                  <div className="flex justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500">Perceptual Hash:</span>
                    <strong className="text-rose-600 font-mono">{selectedPair.evidence.phash_result}</strong>
                  </div>
                  <div className="flex justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500">Haversine Distance:</span>
                    <strong className="text-rose-600 font-mono">{selectedPair.evidence.distance_result}</strong>
                  </div>
                  <div className="flex justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500">Lexical Similarity:</span>
                    <strong className="text-amber-700 font-mono">{selectedPair.evidence.text_similarity}</strong>
                  </div>
                  <div className="flex justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500">Metadata Alignment:</span>
                    <strong className="text-slate-800">{selectedPair.evidence.metadata_comparison}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate(`/works/${selectedPair.work_a.work_code}`)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>Inspect Work Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sortable Table of All Detected Duplicate Pairs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Detected Duplicate Pairs Queue</h3>
          <span className="text-xs text-slate-400 font-mono">{pairs.length} Flagged Pairs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">Pair ID</th>
                <th className="py-2.5 px-3.5">Work A</th>
                <th className="py-2.5 px-3.5">Work B</th>
                <th className="py-2.5 px-3.5 text-center">Photo Match</th>
                <th className="py-2.5 px-3.5 text-center">GPS Distance</th>
                <th className="py-2.5 px-3.5 text-center">Confidence</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pairs.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPair(p)}
                  className={`cursor-pointer transition ${
                    selectedPair?.id === p.id ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{p.pair_id}</td>
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-slate-900">{p.work_a.work_code}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{p.work_a.project_name}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-slate-900">{p.work_b.work_code}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{p.work_b.project_name}</div>
                  </td>
                  <td className="py-3 px-3.5 text-center font-bold text-rose-600">{p.photo_similarity_pct}%</td>
                  <td className="py-3 px-3.5 text-center text-slate-700 font-mono">{p.geo_distance_m}m</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {p.combined_confidence}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/works/${p.work_a.work_code}`);
                      }}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-bold border border-blue-200 transition"
                    >
                      View File
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
