import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: '#F8F6EF' }}>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
          <footer
            className="py-3 px-6 text-center text-[11px]"
            style={{
              borderTop: '1px solid rgba(234,226,183,0.8)',
              background: 'rgba(255,255,255,0.7)',
              color: 'rgba(0,48,73,0.45)',
            }}
          >
            AICTE FDR Management Portal •{' '}
            <span style={{ color: '#F77F00', fontWeight: 600 }}>All India Council for Technical Education</span>
            , New Delhi
          </footer>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
