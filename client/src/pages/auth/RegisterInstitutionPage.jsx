import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building, ShieldCheck, Mail, Lock, Phone, MapPin, User, ArrowRight, AlertCircle } from 'lucide-react';

const INSTITUTION_TYPES = [
  'Engineering & Technology',
  'Management',
  'Pharmacy',
  'Architecture & Town Planning',
  'Applied Arts & Crafts',
  'Polytechnic / Diploma',
];

const DESIGNATIONS = ['Registrar', 'Director', 'Principal', 'Finance Officer', 'Nodal Officer'];

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2.5 mb-4 pb-3"
    style={{ borderBottom: '1px solid rgba(234,226,183,0.8)' }}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: 'rgba(247,127,0,0.12)' }}>
      <Icon className="w-4 h-4" style={{ color: '#F77F00' }} />
    </div>
    <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wide">{title}</h3>
  </div>
);

const RegisterInstitutionPage = () => {
  const { registerInstitution } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    aictePermanentId: '',
    institutionName: '',
    institutionType: 'Engineering & Technology',
    address: '',
    state: '',
    city: '',
    pincode: '',
    contactEmail: '',
    contactPhone: '',
    adminName: '',
    adminEmail: '',
    designation: 'Registrar',
    phone: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    const res = await registerInstitution(formData);
    setLoading(false);
    if (res.success) {
      alert('Institution registered successfully! Redirecting to institution workspace...');
      navigate('/institution/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 sm:px-6"
      style={{ background: 'linear-gradient(135deg, #001e30 0%, #003049 50%, #00406a 100%)' }}>

      {/* Logo + Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg mb-3"
          style={{ background: 'linear-gradient(135deg, #F77F00 0%, #FCBF49 100%)' }}>
          <Building className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white">Technical Institution Registration</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(234,226,183,0.65)' }}>
          Enroll your institution in the AICTE FDR Management Portal
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid rgba(234,226,183,0.4)' }}>

        {/* Card Header bar */}
        <div className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, #F77F00 0%, #FCBF49 50%, #003049 100%)' }} />

        <div className="p-6 sm:p-10 space-y-7">
          {/* Error */}
          {error && (
            <div className="alert-error fade-up">
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#D62828' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7 text-xs">

            {/* Section 1: Affiliation */}
            <div>
              <SectionHeader icon={ShieldCheck} title="AICTE Affiliation Particulars" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">AICTE Permanent ID *</label>
                    <input
                      type="text" required name="aictePermanentId"
                      value={formData.aictePermanentId} onChange={handleChange}
                      placeholder="e.g. 1-432890123"
                      className="input-field font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="input-label">Institution Type *</label>
                    <select
                      name="institutionType"
                      value={formData.institutionType} onChange={handleChange}
                      className="input-field"
                    >
                      {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Full Institution Name *</label>
                  <input
                    type="text" required name="institutionName"
                    value={formData.institutionName} onChange={handleChange}
                    placeholder="e.g. Delhi Institute of Engineering & Advanced Technology"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Campus Address</label>
                  <input
                    type="text" name="address"
                    value={formData.address} onChange={handleChange}
                    placeholder="Campus address line / Institutional area"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'state', label: 'State *', placeholder: 'State', required: true },
                    { name: 'city', label: 'City *', placeholder: 'City', required: true },
                    { name: 'pincode', label: 'Pincode *', placeholder: 'Pincode', required: true },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className="input-label">{f.label}</label>
                      <input
                        type="text" name={f.name} required={f.required}
                        value={formData[f.name]} onChange={handleChange}
                        placeholder={f.placeholder}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Official Contact Email *</label>
                    <input
                      type="email" required name="contactEmail"
                      value={formData.contactEmail} onChange={handleChange}
                      placeholder="contact@institution.ac.in"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">Official Contact Phone *</label>
                    <input
                      type="tel" required name="contactPhone"
                      value={formData.contactPhone} onChange={handleChange}
                      placeholder="e.g. 011-28080123"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Nodal User */}
            <div>
              <SectionHeader icon={User} title="Primary Nodal User Credentials" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Nodal Officer / Registrar Name *</label>
                    <input
                      type="text" required name="adminName"
                      value={formData.adminName} onChange={handleChange}
                      placeholder="Full Name"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">Designation</label>
                    <select
                      name="designation"
                      value={formData.designation} onChange={handleChange}
                      className="input-field"
                    >
                      {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">User Login Email *</label>
                    <input
                      type="email" required name="adminEmail"
                      value={formData.adminEmail} onChange={handleChange}
                      placeholder="registrar@institution.ac.in"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">Password * (Min 6 characters)</label>
                    <input
                      type="password" required name="password"
                      value={formData.password} onChange={handleChange}
                      placeholder="••••••••"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-bhagwa w-full justify-center py-3 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Registering Institution...
                </span>
              ) : (
                <>Submit Institutional Registration <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-brand-muted">
            Already registered?{' '}
            <Link to="/login" className="font-bold hover:underline" style={{ color: '#F77F00' }}>
              Sign In here
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px]" style={{ color: 'rgba(234,226,183,0.4)' }}>
        All India Council for Technical Education (AICTE), New Delhi
      </p>
    </div>
  );
};

export default RegisterInstitutionPage;
