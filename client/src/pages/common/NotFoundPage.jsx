import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #001e30 0%, #003049 50%, #00406a 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-2xl fade-up"
        style={{ border: '1px solid rgba(234,226,183,0.4)' }}>
        {/* Number */}
        <div className="text-7xl font-display font-extrabold mb-2"
          style={{ background: 'linear-gradient(135deg, #F77F00, #FCBF49)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          404
        </div>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(247,127,0,0.10)', border: '1px solid rgba(247,127,0,0.25)' }}>
          <FileQuestion className="w-7 h-7" style={{ color: '#F77F00' }} />
        </div>

        <h2 className="text-xl font-display font-bold text-brand-navy">Page Not Found</h2>
        <p className="text-xs text-brand-muted mt-2 leading-relaxed">
          The requested AICTE FDR Management Portal resource or route does not exist.
        </p>

        <button
          onClick={() => navigate('/')}
          className="btn-bhagwa mx-auto mt-6 justify-center"
        >
          <Home className="w-4 h-4" /> Return to Homepage
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
