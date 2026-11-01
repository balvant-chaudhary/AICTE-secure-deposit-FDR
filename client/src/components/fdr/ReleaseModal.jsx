import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ShieldCheck, IndianRupee, AlertCircle, Building } from 'lucide-react';

const ReleaseModal = ({ isOpen, onClose, fdr, onReleaseSubmitted }) => {
  const [reason, setReason] = useState('');
  const [closureJustification, setClosureJustification] = useState('');
  const [bankName, setBankName] = useState(fdr?.bankName || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState(fdr?.ifscCode || '');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [document, setDocument] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!fdr) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !bankName || !accountNumber || !ifscCode || !beneficiaryName) {
      alert('Please fill in all mandatory refund account fields and justification.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('fdrId', fdr._id);
      formData.append('reason', reason);
      formData.append('closureJustification', closureJustification || reason);
      formData.append('bankName', bankName);
      formData.append('accountNumber', accountNumber);
      formData.append('ifscCode', ifscCode.toUpperCase());
      formData.append('beneficiaryName', beneficiaryName);
      if (document) formData.append('document', document);

      await api.post('/requests/release', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Security deposit release & refund request submitted. Awaiting AICTE Officer clearance & Admin approval.');
      onClose();
      if (onReleaseSubmitted) onReleaseSubmitted();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit release request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Request Security Deposit Release: ${fdr.fdrNumber}`} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Compliance Notice */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">AICTE Regulatory Mandate:</span>
            Release of security deposit requires multi-tier verification (Officer clearance + Admin authorization order). Funds are not automatically disbursed.
          </div>
        </div>

        {/* Deposit summary */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-slate-500 block">Refundable Deposit Amount</span>
            <span className="text-base font-display font-bold text-brand-navy">{formatCurrency(fdr.amount)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">FDR Status</span>
            <span className="font-semibold text-purple-700">{fdr.status}</span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Grounds for Release / Refund Request *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Select Reason --</option>
            <option value="Tenure Completed (10-Year Mandatory Term Expired)">
              Tenure Completed (10-Year Mandatory Term Expired)
            </option>
            <option value="Approved Course Closure / Intake Reduction">
              Approved Course Closure / Intake Reduction
            </option>
            <option value="Institution Surrender of Approval with AICTE Clearance">
              Institution Surrender of Approval with AICTE Clearance
            </option>
            <option value="Replacement with Bank Guarantee / Fresh FDR">
              Replacement with Bank Guarantee / Fresh FDR
            </option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Detailed Justification & Clearance Reference
          </label>
          <textarea
            rows={2}
            value={closureJustification}
            onChange={(e) => setClosureJustification(e.target.value)}
            placeholder="Reference AICTE letter numbers, student clearance certificates, or audit reports..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Beneficiary Account Details */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Building className="w-3.5 h-3.5 text-brand-bhagwa" /> Beneficiary Refund Account Details
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">IFSC Code *</label>
              <input
                type="text"
                required
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="IFSC"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Official Account No."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Beneficiary Name *</label>
              <input
                type="text"
                required
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Institution Official Account Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Attach AICTE NOC or Clearance Letter (PDF)
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setDocument(e.target.files[0])}
            className="w-full text-xs text-brand-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Release Petition'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReleaseModal;
