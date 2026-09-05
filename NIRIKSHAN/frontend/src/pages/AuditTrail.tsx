import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Download,
  Filter,
  ArrowRight,
  ShieldCheck,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { getAuditTrail, API_BASE } from '../services/api';
import { AuditLogItem } from '../types';

interface AuditTrailProps {
  onNavigate: (route: string) => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditLogItem | null>(null);
  const [workIdFilter, setWorkIdFilter] = useState('');
  const [userFilter, setUserFilter] = useState('All Users');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [loading, setLoading] = useState(true);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const data = await getAuditTrail({
        work_id: workIdFilter || undefined,
        user: userFilter !== 'All Users' ? userFilter : undefined,
        role: roleFilter !== 'All Roles' ? roleFilter : undefined,
        action: actionFilter !== 'All Actions' ? actionFilter : undefined,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
      if (data.items?.length > 0 && !selectedEvent) {
        setSelectedEvent(data.items[0]);
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [userFilter, roleFilter, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAudit();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Audit Trail</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Immutable cryptographic ledger of system calculations, reviewer actions, and official rulings</p>
        </div>

        <button
          onClick={() => window.open(`${API_BASE}/reports/download?type=AuditTrail&format=CSV`, '_blank')}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Work ID..."
              value={workIdFilter}
              onChange={(e) => setWorkIdFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Users">User (All)</option>
            <option value="System">System</option>
            <option value="P. Sharma">P. Sharma</option>
            <option value="D. Kumar">D. Kumar</option>
            <option value="M. Singh">M. Singh</option>
            <option value="R. Patel">R. Patel</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Roles">Role (All)</option>
            <option value="System">System</option>
            <option value="Reviewer">Reviewer</option>
            <option value="District Officer">District Officer</option>
            <option value="Administrator">Administrator</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All Actions">Action (All)</option>
            <option value="Risk recalculated">Risk recalculated</option>
            <option value="Duplicate photo detected">Duplicate photo detected</option>
            <option value="Dataset synchronized">Dataset synchronized</option>
            <option value="Decision submitted">Decision submitted</option>
            <option value="Case escalated">Case escalated</option>
          </select>

          <button
            type="submit"
            className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition text-center"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Main Split: Audit Table + Event Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Audit Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">Actor / User</th>
                  <th className="py-2.5 px-3.5">Role</th>
                  <th className="py-2.5 px-3.5">Action</th>
                  <th className="py-2.5 px-3.5">Target ID</th>
                  <th className="py-2.5 px-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => {
                  const isSelected = selectedEvent?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedEvent(log)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">{log.user}</td>
                      <td className="py-3 px-3.5 text-slate-600">{log.role}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-blue-700 font-bold">{log.work_id}</td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-[200px] truncate">{log.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Total {total} immutable audit events recorded
          </div>
        </div>

        {/* Right: Selected Event Detail */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {selectedEvent ? (
            <>
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold uppercase text-slate-400">Audit Detail Dossier</span>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">{selectedEvent.action}</h2>
                <span className="text-xs font-mono text-blue-700 font-bold">{selectedEvent.work_id}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Full Description</span>
                  <p className="text-slate-800 font-medium leading-relaxed">{selectedEvent.details}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Previous State</span>
                    <strong className="text-slate-700">{selectedEvent.previous_state}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">New State</span>
                    <strong className="text-emerald-700">{selectedEvent.new_state}</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Authorized User:</span>
                    <strong className="text-slate-900">{selectedEvent.user} ({selectedEvent.role})</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Exact Timestamp:</span>
                    <strong className="text-slate-800 font-mono">{selectedEvent.full_timestamp}</strong>
                  </div>
                </div>

                {selectedEvent.evidence_link && (
                  <button
                    onClick={() => onNavigate(selectedEvent.evidence_link!)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5"
                  >
                    <span>View Related Forensic Evidence</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">Select an event from the audit log</div>
          )}
        </div>
      </div>
    </div>
  );
};
