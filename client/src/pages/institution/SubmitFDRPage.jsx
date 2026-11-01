import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fdrService } from '../../services/fdrService';
import { PURPOSE_OPTIONS, BANK_SUGGESTIONS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import {
  FilePlus2,
  Upload,
  Building2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

const SubmitFDRPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    fdrNumber: '',
    bankName: 'State Bank of India',
    branchName: '',
    ifscCode: '',
    amount: '',
    depositDate: '',
    maturityDate: '',
    autoRenewal: false,
    purpose: PURPOSE_OPTIONS[0] || 'Establishment of New Technical Institution',
    jointAccountHolder: 'Member Secretary, AICTE & Principal/Director',
    remarks: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];

      if (!allowedExts.includes(ext)) {
        setError('Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.');
        e.target.value = '';
        setFile(null);
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size exceeds the 5 MB limit. Please upload a compressed document.');
        e.target.value = '';
        setFile(null);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 1. Mandatory field checks
    if (
      !formData.fdrNumber.trim() ||
      !formData.bankName.trim() ||
      !formData.branchName.trim() ||
      !formData.ifscCode.trim() ||
      !formData.amount ||
      !formData.depositDate ||
      !formData.maturityDate ||
      !formData.purpose.trim()
    ) {
      setError('Please fill in all mandatory fields marked with an asterisk (*).');
      return;
    }

    // 2. Amount Validation
    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Deposit amount must be a valid number greater than zero.');
      return;
    }

    // 3. Date Validation: maturityDate must be after depositDate
    const depDate = new Date(formData.depositDate);
    const matDate = new Date(formData.maturityDate);
    if (isNaN(depDate.getTime()) || isNaN(matDate.getTime())) {
      setError('Please select valid deposit and maturity dates.');
      return;
    }
    if (matDate <= depDate) {
      setError('Maturity date must be after the deposit date.');
      return;
    }

    // 4. File scan requirement
    if (!file) {
      setError('Please attach the official scanned copy of the FDR certificate or receipt (PDF, JPG, PNG up to 5 MB).');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      data.append('document', file);

      const res = await fdrService.submitFDR(data);

      setSuccessMsg(`FDR ${formData.fdrNumber.toUpperCase()} submitted successfully for AICTE verification!`);
      setTimeout(() => {
        navigate('/institution/my-fdrs');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit FDR. Please verify details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/institution/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-slate-800 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-brand-bhagwa" /> Submit New Security Deposit / FDR
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Register institution Fixed Deposit Receipt and upload proof of joint AICTE lien endorsement
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg} Redirecting to your FDR register...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Deposit Particulars & Bank Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
            <IndianRupee className="w-4 h-4 text-brand-bhagwa" /> Deposit Particulars & Bank Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                FDR Receipt / Certificate Number *
              </label>
              <input
                type="text"
                required
                name="fdrNumber"
                placeholder="e.g. FDR/SBI/2026/12345"
                value={formData.fdrNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Amount (₹ INR) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                name="amount"
                placeholder="e.g. 2500000"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa font-bold"
              />
              {formData.amount && Number(formData.amount) > 0 && (
                <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                  Amount in Words/Formatted: {formatCurrency(Number(formData.amount))}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select or Enter Issuing Bank *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BANK_SUGGESTIONS.slice(0, 6).map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setFormData((p) => ({ ...p, bankName: b }))}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition ${
                    formData.bankName === b
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Full Bank Name"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                required
                name="branchName"
                placeholder="e.g. Connaught Place, New Delhi"
                value={formData.branchName}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch IFSC Code *
              </label>
              <input
                type="text"
                required
                name="ifscCode"
                placeholder="e.g. SBIN0000691"
                value={formData.ifscCode}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Deposit *
              </label>
              <input
                type="date"
                required
                name="depositDate"
                value={formData.depositDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Maturity *
              </label>
              <input
                type="date"
                required
                name="maturityDate"
                value={formData.maturityDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
          </div>
        </div>

        {/* Step 2: AICTE Mandate & Joint Custody */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-brand-bhagwa" /> Regulatory Purpose & Joint Custody
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Purpose *
              </label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
              >
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Joint Account Endorsement Holder *
              </label>
              <input
                type="text"
                required
                name="jointAccountHolder"
                value={formData.jointAccountHolder}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoRenewal"
              name="autoRenewal"
              checked={formData.autoRenewal}
              onChange={handleChange}
              className="w-4 h-4 text-brand-bhagwa rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="autoRenewal" className="text-xs text-slate-700 font-medium cursor-pointer">
              FDR is tagged for automatic bank renewal instructions at CBS
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / AICTE Reference Note
            </label>
            <textarea
              rows={2}
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="e.g. Submitted against AICTE Letter of Approval Ref: F.No. 1-432890123/2026/LoA"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-bhagwa"
            />
          </div>
        </div>

        {/* Step 3: Document Upload Vault */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-brand-bhagwa" /> Document Upload Vault
          </h2>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
            <Upload className="w-8 h-8 text-brand-bhagwa mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">
              Upload Official FDR Certificate / Bank Deposit Receipt Scan *
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Must clearly display Bank Seal, FDR Number, Amount, and AICTE Joint Custody Lien Endorsement (PDF, PNG, JPG up to 5 MB)
            </p>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="mt-4 block mx-auto text-xs text-brand-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            {file && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/institution/dashboard')}
            className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 btn-bhagwa rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Submitting to AICTE...' : 'Submit FDR for Verification'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitFDRPage;
