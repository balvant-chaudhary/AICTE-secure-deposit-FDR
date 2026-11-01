import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fdrService } from '../../services/fdrService';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import VerificationResultModal from '../../components/fdr/VerificationResultModal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  Building2,
  FileText,
  Download,
  ShieldCheck,
  Calendar,
  IndianRupee,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  RefreshCw
} from 'lucide-react';

const FDRDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fdr, setFdr] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);

  // Edit / Rectification State
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    depositDate: '',
    maturityDate: '',
    purpose: '',
    remarks: ''
  });
  const [newFile, setNewFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchFDRData = async () => {
    try {
      setLoading(true);
      setError('');

      const fdrRes = await fdrService.getFDRById(id);
      const data = fdrRes.data?.fdr;
      setFdr(data);

      setEditFormData({
        amount: data?.amount || '',
        depositDate: data?.depositDate ? data.depositDate.split('T')[0] : '',
        maturityDate: data?.maturityDate ? data.maturityDate.split('T')[0] : '',
        purpose: data?.purpose || '',
        remarks: data?.remarks || ''
      });

      // Try fetching audit logs if available
      try {
        const logsRes = await api.get(`/audit/fdr/${id}`);
        setAuditLogs(logsRes.data?.data?.logs || []);
      } catch (logErr) {
        // Audit log service may be in fallback mode
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load FDR details:', err);
      setError(err.response?.data?.message || 'Failed to load FDR record. Record may not exist or access is restricted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDRData();
  }, [id]);

  const handleDownload = async () => {
    if (!fdr?._id) return;
    try {
      setDownloading(true);
      await fdrService.downloadDocument(
        fdr._id,
        fdr.documentOriginalName || `FDR_${fdr.fdrNumber}_Receipt.pdf`
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download document scan.');
    } finally {
      setDownloading(false);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    const numAmount = Number(editFormData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditError('Deposit amount must be greater than zero.');
      return;
    }

    if (new Date(editFormData.maturityDate) <= new Date(editFormData.depositDate)) {
      setEditError('Maturity date must be after deposit date.');
      return;
    }

    try {
      setResubmitting(true);
      const formData = new FormData();
      formData.append('amount', editFormData.amount);
      formData.append('depositDate', editFormData.depositDate);
      formData.append('maturityDate', editFormData.maturityDate);
      formData.append('purpose', editFormData.purpose);
      formData.append('remarks', editFormData.remarks);
      if (newFile) {
        formData.append('document', newFile);
      }

      await fdrService.updateFDR(fdr._id, formData, true);
      alert('FDR record updated and resubmitted successfully!');
      setShowEditForm(false);
      fetchFDRData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update FDR.');
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Loading deposit record details...
      </div>
    );
  }

  if (error || !fdr) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error || 'FDR record not found.'}
        </div>
        <button
          onClick={() => navigate('/institution/my-fdrs')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Return to My FDRs
        </button>
      </div>
    );
  }

  const isEditable = fdr.status === 'SUBMITTED' || fdr.status === 'DISCREPANCY_FLAGGED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/institution/my-fdrs')}
            className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-slate-800 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My FDRs
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-display font-bold text-brand-navy font-mono tracking-tight">
              {fdr.fdrNumber}
            </h1>
            <StatusBadge status={fdr.status} />
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Deposit Registered on {formatDate(fdr.createdAt)} • AICTE Joint Lien Reserve
          </p>
        </div>

        {isEditable && !showEditForm && (
          <button
            onClick={() => setShowEditForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Edit3 className="w-4 h-4 text-brand-bhagwa" /> Edit / Rectify Details
          </button>
        )}
      </div>

      {/* Discrepancy Alert Box */}
      {fdr.status === 'DISCREPANCY_FLAGGED' && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            AICTE Officer Discrepancy Flag
          </div>
          <p className="text-xs text-rose-900">
            <strong>Reason:</strong> {fdr.discrepancy?.reason || 'Mismatch detected between submitted details and bank CBS records.'}
          </p>
          <div className="flex items-center justify-between pt-1">
            {fdr.discrepancy?.flaggedAt && (
              <span className="text-[11px] text-rose-600 block">
                Flagged on {formatDateTime(fdr.discrepancy.flaggedAt)}
              </span>
            )}
            <button
              onClick={() => setShowVerifModal(true)}
              className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-300 text-xs transition"
            >
              View Full Bank CBS Comparison Report
            </button>
          </div>
        </div>
      )}

      {/* Verified Banner for Active FDRs */}
      {fdr.status === 'VERIFIED_ACTIVE' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-xs text-emerald-900 block">
                FDR Successfully Verified & Active
              </span>
              <span className="text-[11px] text-emerald-700">
                100% details match confirmed with Core Banking System (CBS). AICTE joint lien endorsement active.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowVerifModal(true)}
            className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-xs transition shrink-0"
          >
            View Verification Report
          </button>
        </div>
      )}

      {/* Edit Form Modal/Drawer */}
      {showEditForm && (
        <form onSubmit={handleResubmit} className="bg-white rounded-2xl border border-blue-200 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-brand-bhagwa" /> Edit FDR Submission Details
            </h2>
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deposit Amount (₹ INR) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deposit Date *</label>
              <input
                type="date"
                required
                value={editFormData.depositDate}
                onChange={(e) => setEditFormData({ ...editFormData, depositDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Maturity Date *</label>
              <input
                type="date"
                required
                value={editFormData.maturityDate}
                onChange={(e) => setEditFormData({ ...editFormData, maturityDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Regulatory Purpose</label>
              <input
                type="text"
                value={editFormData.purpose}
                onChange={(e) => setEditFormData({ ...editFormData, purpose: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Remarks / Explanation</label>
            <textarea
              rows={2}
              value={editFormData.remarks}
              onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-bhagwa"
              placeholder="Explain correction or provide AICTE sanction context..."
            />
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              Replace Scanned Document (Optional, PDF/JPG/PNG up to 5 MB)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setNewFile(e.target.files[0] || null)}
              className="text-xs text-brand-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resubmitting}
              className="px-5 py-2 btn-bhagwa rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {resubmitting ? 'Saving Changes...' : 'Save & Resubmit'}
            </button>
          </div>
        </form>
      )}

      {/* Main FDR Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): FDR Particulars */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
              <IndianRupee className="w-4 h-4 text-brand-bhagwa" /> Fixed Deposit Particulars
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Deposit Amount
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(fdr.amount)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Issuing Banking Institution
                </span>
                <span className="font-bold text-slate-900 block">{fdr.bankName}</span>
                <span className="text-slate-500 text-[11px] block">{fdr.branchName}</span>
                <span className="text-blue-700 font-mono text-[10px] font-semibold">
                  IFSC: {fdr.ifscCode}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Date of Deposit
                </span>
                <span className="font-semibold text-slate-800">
                  {formatDate(fdr.depositDate)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Date of Maturity
                </span>
                <span className="font-semibold text-slate-800">
                  {formatDate(fdr.maturityDate)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Regulatory Purpose:</span>
                <span className="font-semibold text-slate-800 text-right">{fdr.purpose}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Joint Account Endorsement:</span>
                <span className="font-semibold text-slate-800 text-right">{fdr.jointAccountHolder}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Auto-Renewal Tag:</span>
                <span className="font-semibold text-slate-800">
                  {fdr.autoRenewal ? 'Yes (Automatic Bank Rollover)' : 'No (Manual Review Required)'}
                </span>
              </div>
              {fdr.remarks && (
                <div className="py-1">
                  <span className="text-slate-500 font-medium block">Institution Remarks:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg mt-1 border border-slate-200/60">
                    {fdr.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attached Document Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-brand-bhagwa" /> Attached FDR Certificate Scan
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  PDF
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 block truncate max-w-[280px]">
                    {fdr.documentOriginalName || 'FDR_Certificate_Scan.pdf'}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {fdr.fileSize ? `${(fdr.fileSize / 1024).toFixed(1)} KB` : 'Verified attachment'} • {fdr.documentMimeType || 'application/pdf'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 btn-bhagwa rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50 shrink-0"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading...' : 'Download Document'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Institution & Verification Info */}
        <div className="space-y-6">
          {/* Institution Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Building2 className="w-4 h-4 text-brand-bhagwa" /> Institution Particulars
            </h2>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Institution Name</span>
              <span className="font-bold text-slate-900 block mt-0.5">{fdr.institutionId?.name}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">AICTE Permanent ID</span>
              <span className="font-mono font-bold text-blue-700 block mt-0.5">
                {fdr.institutionId?.aictePermanentId}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Institution Type</span>
              <span className="text-slate-700 block mt-0.5">
                {fdr.institutionId?.institutionType || 'Technical Institution'}
              </span>
            </div>

            {fdr.institutionId?.city && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Campus Location</span>
                <span className="text-slate-700 block mt-0.5">
                  {fdr.institutionId.city}, {fdr.institutionId.state} - {fdr.institutionId.pincode}
                </span>
              </div>
            )}
          </div>

          {/* Submission Submitter Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <ShieldCheck className="w-4 h-4 text-brand-bhagwa" /> Submitter Identity
            </h2>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Nodal Officer</span>
              <span className="font-bold text-slate-900 block mt-0.5">{fdr.submittedBy?.name || 'Verified User'}</span>
              <span className="text-slate-500 text-[11px] block">{fdr.submittedBy?.designation}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Official Email</span>
              <span className="text-slate-700 block mt-0.5">{fdr.submittedBy?.email}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Timestamp</span>
              <span className="text-slate-700 block mt-0.5">{formatDateTime(fdr.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {showVerifModal && (
        <VerificationResultModal
          isOpen={showVerifModal}
          onClose={() => setShowVerifModal(false)}
          fdrId={fdr?._id}
          fdrNumber={fdr?.fdrNumber}
        />
      )}
    </div>
  );
};

export default FDRDetailsPage;
