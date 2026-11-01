import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  User,
  Activity,
  FileText
} from 'lucide-react';

const SystemAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      let query = '/audit?limit=100';
      if (actionFilter) query += `&actionType=${actionFilter}`;
      const res = await api.get(query);
      setLogs(res.data.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <History className="w-6 h-6 text-purple-700" /> System Audit & Compliance Ledger
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Tamper-evident chronological activity log capturing all logins, submissions, bank queries, and approval decisions
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
          >
            <option value="">All Action Types</option>
            <option value="FDR_SUBMISSION">FDR Submission</option>
            <option value="BANK_VERIFICATION_TRIGGERED">Bank CBS Verification</option>
            <option value="OFFICER_APPROVAL">Officer Approval</option>
            <option value="DISCREPANCY_FLAGGED">Discrepancy Flagged</option>
            <option value="RENEWAL_REQUESTED">Renewal Requested</option>
            <option value="RELEASE_REQUESTED">Release Requested</option>
            <option value="RELEASE_RECOMMENDED">Release Recommended</option>
            <option value="RELEASE_APPROVED">Release Approved</option>
            <option value="STATUS_CHANGE_AUTOMATED">Automated Cron State Change</option>
            <option value="USER_LOGIN">User Authentication</option>
          </select>
        </div>
        <span className="text-xs text-brand-muted">
          Showing <strong>{logs.length}</strong> recorded audit events
        </span>
      </div>

      {/* Log Entries */}
      <div className="bg-white rounded-2xl shadow-card divide-y divide-slate-100 overflow-hidden" style={{ border: '1px solid rgba(234,226,183,0.7)' }}>
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit logs found matching the selected action filter.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="p-4 hover:bg-brand-cream/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      log.actionType.includes('DISCREPANCY')
                        ? 'bg-rose-100 text-rose-800'
                        : log.actionType.includes('APPROVED')
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.actionType.includes('RELEASE')
                        ? 'bg-purple-100 text-purple-800'
                        : log.actionType.includes('BANK')
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {log.actionType}
                  </span>
                  <span className="font-semibold text-xs text-slate-900">
                    {log.entityType} ({log.entityId ? log.entityId.slice(-6) : ''})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatDateTime(log.timestamp)}
                </span>
              </div>

              <p className="text-xs text-slate-700 mt-2 font-medium">
                {log.details}
              </p>

              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <strong>{log.userName || log.userId?.name || 'System Daemon'}</strong> ({log.userRole})
                </span>
                {log.institutionId?.name && (
                  <span>Institution: {log.institutionId.name}</span>
                )}
                {log.ipAddress && <span>IP: {log.ipAddress}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SystemAuditLogsPage;
