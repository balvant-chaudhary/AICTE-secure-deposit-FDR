import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, Download, RefreshCw, IndianRupee, ShieldCheck } from 'lucide-react';

const AnalyticsReportsPage = () => {
  const [bankDist, setBankDist] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [bankRes, timelineRes, statusRes] = await Promise.all([
        api.get('/analytics/bank-distribution'),
        api.get('/analytics/maturity-timeline'),
        api.get('/analytics/status-breakdown')
      ]);
      setBankDist(bankRes.data.data.bankDistribution || []);
      setTimeline(timelineRes.data.data.timeline || []);
      setStatusBreakdown(statusRes.data.data.distribution || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const chartColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

  const bankData = bankDist.map((item) => ({
    bank: item._id,
    amountInLakh: Math.round(item.totalAmount / 100000),
    count: item.count
  }));

  const pieData = statusBreakdown.map((item) => ({
    name: item._id,
    value: item.count
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-700" /> Financial Analytics & Regulatory Reports
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Macro-level economic intelligence, bank concentration risk, and maturity projections
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Exposure */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Banking Sector Deposit Distribution</h3>
          <p className="text-xs text-brand-muted mb-4">Total volume held by banking institution (in Lakhs INR)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bank" angle={-25} textAnchor="end" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val) => [`₹${val} Lakhs`, 'Amount']} />
                <Bar dataKey="amountInLakh" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Lifecycle Status Composition</h3>
          <p className="text-xs text-brand-muted mb-4">Active vs Discrepant vs Matured deposits</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 12-Month Projections Curve */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-1">12-Month Scheduled Maturity Curve</h3>
        <p className="text-xs text-brand-muted mb-4">Monthly projection of security deposits maturing over the next year</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val) => [formatCurrency(val), 'Volume']} />
              <Area type="monotone" dataKey="totalAmount" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReportsPage;
