import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleGoHome = () => {
    if (role === 'institution') navigate('/institution/dashboard');
    else if (role === 'officer') navigate('/officer/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #001e30 0%, #003049 50%, #00406a 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-2xl fade-up"
        style={{ border: '1px solid rgba(234,226,183,0.4)' }}>

        {/* Red shield icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(214,40,40,0.08)', border: '1px solid rgba(214,40,40,0.22)' }}>
          <ShieldAlert className="w-8 h-8" style={{ color: '#D62828' }} />
        </div>

        <h2 className="text-xl font-display font-bold text-brand-navy">Access Restricted</h2>
        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(214,40,40,0.08)', color: '#9b1c1c', border: '1px solid rgba(214,40,40,0.22)' }}>
          Error 403 — Insufficient Clearance
        </div>

        <p className="text-xs text-brand-muted mt-4 leading-relaxed">
          Your current account role (<strong className="text-brand-navy">{role || 'Guest'}</strong>) does not
          possess regulatory clearance to access this portal module.
        </p>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline-navy py-2 px-4 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go Back
          </button>
          <button
            onClick={handleGoHome}
            className="btn-bhagwa"
          >
            <Home className="w-3.5 h-3.5" /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
