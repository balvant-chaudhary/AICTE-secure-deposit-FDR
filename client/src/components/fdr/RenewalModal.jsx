import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RefreshCw, Upload, Calendar, IndianRupee, FileText } from 'lucide-react';

const RenewalModal = ({ isOpen, onClose, fdr, onRenewalSubmitted }) => {
  const [newMaturityDate, setNewMaturityDate] = useState('');
  const [newAmount, setNewAmount] = useState(fdr?.amount || '');
  const [newFdrNumber, setNewFdrNumber] = useState(fdr?.fdrNumber || '');
  const [reason, setReason] = useState('');
  const [document, setDocument] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!fdr) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMaturityDate || !reason) {
      alert('Please fill in the new maturity date and reason.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('fdrId', fdr._id);
      formData.append('newMaturityDate', newMaturityDate);
      if (newAmount) formData.append('newAmount', newAmount);
      if (newFdrNumber) formData.append('newFdrNumber', newFdrNumber);
      formData.append('reason', reason);
      if (document) formData.append('document', document);

      await api.post('/requests/renewal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Renewal request submitted successfully for AICTE Officer review.');
      onClose();
      if (onRenewalSubmitted) onRenewalSubmitted();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit renewal request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Request Renewal: ${fdr.fdrNumber}`} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Info header */}
        <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between text-blue-900">
          <div>
            <span className="font-semibold block">{fdr.bankName}</span>
            <span className="text-blue-700">Current Amount: {formatCurrency(fdr.amount)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Current Maturity</span>
            <span className="font-semibold text-slate-800">{formatDate(fdr.maturityDate)}</span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            New Extended Maturity Date *
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={newMaturityDate}
              onChange={(e) => setNewMaturityDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewed Amount (₹ INR)
            </label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="e.g. 2500000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewed FDR Number (if changed)
            </label>
            <input
              type="text"
              value={newFdrNumber}
              onChange={(e) => setNewFdrNumber(e.target.value)}
              placeholder="FDR number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Renewal Justification / Note *
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Mandatory 3-year extension for continuing course approval term..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Upload Renewed FDR Certificate / Deposit Advice (PDF/PNG)
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
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
            {submitting ? 'Submitting...' : 'Submit Renewal Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RenewalModal;
