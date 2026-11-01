import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Portal Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-cream/30 flex items-center justify-center p-6 font-sans">
          <div
            className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl text-center space-y-5"
            style={{ border: '1px solid rgba(234,226,183,0.8)' }}
          >
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-rose-50 border border-rose-200">
              <AlertTriangle className="w-8 h-8 text-brand-red" />
            </div>

            <div>
              <h2 className="text-xl font-display font-bold text-brand-navy">
                Unexpected Interface Error
              </h2>
              <p className="text-xs text-brand-muted mt-2">
                An issue occurred while rendering this view. You can return to your dashboard or reload the page.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-[11px] text-slate-700 max-h-28 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost flex items-center gap-1.5 text-xs py-2 px-4"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn-bhagwa flex items-center gap-1.5 text-xs py-2 px-4"
              >
                <Home className="w-3.5 h-3.5" /> Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
