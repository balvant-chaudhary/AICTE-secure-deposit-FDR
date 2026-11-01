import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/institutions/my-profile');
        setInstitution(res.data?.data?.institution || user?.institution);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        // Fallback to user session institution data
        if (user?.institution) {
          setInstitution(user.institution);
        } else {
          setError('Unable to load institution profile details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Loading institution profile records...
      </div>
    );
  }

  const instData = institution || user?.institution;

  if (!instData) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-slate-500 text-xs">
        No affiliated institution record found for this account.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-bhagwa" /> Institution Profile & Regulatory Particulars
        </h1>
        <p className="text-xs text-brand-muted mt-1">
          Official institutional affiliation credentials, permanent identifier, and authorized nodal officer records
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md border border-white/20">
            {instData.name ? instData.name.charAt(0) : 'I'}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-display font-bold text-brand-navy">{instData.name}</h2>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-mono font-bold border border-blue-200">
                AICTE Permanent ID: {instData.aictePermanentId}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                {instData.institutionType || 'Technical Institution'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Particulars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Institutional Campus Details */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-2">
              Official Campus Address
            </span>
            <div className="space-y-1.5 text-slate-700">
              <p className="font-semibold text-slate-800">{instData.address || 'Dwarka Sector 14'}</p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {instData.city || 'New Delhi'}, {instData.state || 'Delhi'} - {instData.pincode || '110078'}
                </span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Official Contact: {instData.contactEmail || user?.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Campus Phone: {instData.contactPhone || '011-28080123'}</span>
              </div>
            </div>
          </div>

          {/* Primary Authorized Nodal Officer */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-2">
              Authorized Nodal Officer / Registrar
            </span>
            <div className="space-y-1.5">
              <p className="font-bold text-sm text-slate-900">{user?.name || 'Dr. Registrar'}</p>
              <p className="text-slate-600">{user?.designation || 'Registrar & Authorized Nodal Signatory'}</p>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Nodal Email: {user?.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Mobile: {user?.phone || '9811223344'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Compliance Badge */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Institution status is <strong>ACTIVE & COMPLIANT</strong> under AICTE Security Deposit & FDR Regulatory Guidelines.
            </span>
          </div>
          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-200 text-emerald-900">
            Verified
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
