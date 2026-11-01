import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{ background: 'rgba(0,30,48,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Positioning Wrapper: full height to enable centering when modal fits, allows scrolling when taller */}
      <div className="flex min-h-full justify-center p-4 sm:p-6 text-center">
        {/* Modal Window Container: retains its natural content height, horizontally centered */}
        <div
          className={`relative z-10 w-full ${maxWidth} my-auto rounded-2xl bg-white text-left shadow-2xl overflow-hidden fade-up`}
          style={{ border: '1px solid rgba(234,226,183,0.7)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{
              borderBottom: '1px solid rgba(234,226,183,0.7)',
              background: 'linear-gradient(135deg, #003049 0%, #00406a 100%)',
            }}
          >
            <h3 className="text-sm font-bold text-white font-display truncate pr-4">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10 shrink-0 text-brand-cream/80 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body: natural flow, full font size and spacing */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
