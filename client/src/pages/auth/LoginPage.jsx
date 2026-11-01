import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Building2, KeyRound } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      const userRole = res.user?.role;
      if (userRole === 'institution') navigate('/institution/dashboard');
      else if (userRole === 'officer') navigate('/officer/dashboard');
      else if (userRole === 'admin') navigate('/admin/dashboard');
      else navigate('/');
    } else {
      setError(res.message);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const demoAccounts = [
    { label: 'Institution', email: 'institution@aicte.gov.in', pass: 'Demo@123', dotColor: '#F77F00' },
    { label: 'AICTE Officer', email: 'officer@aicte.gov.in', pass: 'Demo@123', dotColor: '#16865C' },
    { label: 'AICTE Admin', email: 'admin@aicte.gov.in', pass: 'Demo@123', dotColor: '#D62828' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'linear-gradient(135deg, #001e30 0%, #003049 50%, #00406a 100%)' }}>

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-120px] right-[-80px] w-[380px] h-[380px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #F77F00, transparent 70%)' }} />
        <div className="absolute bottom-[-80px] left-[-60px] w-[280px] h-[280px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #FCBF49, transparent 70%)' }} />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #F77F00 0%, #FCBF49 100%)' }}>
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">AICTE</p>
              <p className="text-[11px]" style={{ color: 'rgba(234,226,183,0.7)' }}>FDR Management Portal</p>
            </div>
          </div>

          <h1 className="text-3xl xl:text-4xl font-display font-bold text-white leading-tight mb-4">
            Secure FDR &<br />
            <span style={{ background: 'linear-gradient(90deg, #F77F00, #FCBF49)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Deposit Management
            </span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(234,226,183,0.75)' }}>
            Centralized portal for managing Security Deposits and Fixed Deposit Receipts submitted by AICTE-affiliated technical institutions.
          </p>
        </div>

        {/* Feature Pillars */}
        <div className="relative space-y-3">
          {[
            { icon: ShieldCheck, text: 'Role-based access: Institution, Officer, Admin' },
            { icon: Building2, text: 'Centralized FDR lifecycle tracking' },
            { icon: KeyRound, text: 'Simulated CBS bank verification engine' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(234,226,183,0.8)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(247,127,0,0.15)', border: '1px solid rgba(247,127,0,0.25)' }}>
                <Icon className="w-4 h-4" style={{ color: '#F77F00' }} />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <p className="relative text-[11px]" style={{ color: 'rgba(234,226,183,0.45)' }}>
          All India Council for Technical Education (AICTE), New Delhi
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-8 lg:px-12">
        {/* Mobile-only logo */}
        <div className="flex lg:hidden flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-3"
            style={{ background: 'linear-gradient(135deg, #F77F00 0%, #FCBF49 100%)' }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-display font-bold text-white text-center">
            AICTE FDR Management Portal
          </h2>
        </div>

        {/* Card */}
        <div className="w-full max-w-md">
          <div className="rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid rgba(234,226,183,0.5)' }}>

            {/* Card Header */}
            <div className="px-8 pt-8 pb-6"
              style={{ borderBottom: '1px solid rgba(234,226,183,0.6)' }}>
              <h2 className="text-xl font-display font-bold text-brand-navy">Sign In</h2>
              <p className="text-xs text-brand-muted mt-1">Sign in with your verified AICTE portal credentials</p>
            </div>

            <div className="px-8 py-6 space-y-5">
              {/* Error */}
              {error && (
                <div className="alert-error fade-up">
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#D62828' }} />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLogin}>
                {/* Email */}
                <div>
                  <label className="input-label">Official Registered Email</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      placeholder="name@institution.ac.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field input-with-icon pl-11"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="input-label">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 pointer-events-none" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field input-with-icon pl-11"
                    />
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-bhagwa w-full justify-center mt-1 py-3 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Accounts */}
              <div className="pt-4" style={{ borderTop: '1px solid rgba(234,226,183,0.8)' }}>
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">
                  Pre-seeded Test Accounts
                </p>
                <div className="space-y-2">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillCredentials(acc.email, acc.pass)}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left text-xs transition-all duration-150 group"
                      style={{
                        background: 'rgba(248,246,239,0.8)',
                        border: '1px solid rgba(234,226,183,0.7)',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: acc.dotColor }} />
                        <div>
                          <span className="font-bold text-brand-navy">{acc.label}:</span>{' '}
                          <span className="text-brand-muted">{acc.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#F77F00' }}>
                        Autofill →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Register Link */}
              <p className="text-center text-xs text-brand-muted pt-2">
                Technical institution not registered?{' '}
                <Link to="/register" className="font-bold hover:underline"
                  style={{ color: '#F77F00' }}>
                  Register Institution
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px]" style={{ color: 'rgba(234,226,183,0.45)' }}>
            All India Council for Technical Education (AICTE), New Delhi
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
