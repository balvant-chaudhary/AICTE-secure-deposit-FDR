import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Building, Search, RefreshCw, Mail, Phone, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';

const InstitutionDirectoryPage = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      let query = '/institutions';
      if (searchTerm) query += `?search=${encodeURIComponent(searchTerm)}`;
      const res = await api.get(query);
      setInstitutions(res.data.data.institutions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInstitutions();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-brand-navy flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-bhagwa" /> Technical Institutions Directory
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Registered technical institutes, universities, and polytechnics under AICTE Security Deposit regulation
          </p>
        </div>
        <button
          onClick={fetchInstitutions}
          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Institution Name or AICTE Permanent ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field input-with-icon pl-11 text-xs py-2"
          />
        </form>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-16 text-center text-slate-400 text-xs">
            Loading institutions...
          </div>
        ) : institutions.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 text-xs">
            No institutions found matching your search.
          </div>
        ) : (
          institutions.map((inst) => (
            <div
              key={inst._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{inst.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      ID: {inst.aictePermanentId}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {inst.institutionType}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {inst.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-brand-muted">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {inst.address?.city}, {inst.address?.state} - {inst.address?.pincode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inst.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{inst.contactPhone}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Nodal Officer: <strong>{inst.nodalOfficer?.name || 'Dr. Registrar'}</strong>
                </span>
                <button
                  onClick={() => navigate(`/admin/all-fdrs?search=${encodeURIComponent(inst.aictePermanentId)}`)}
                  className="px-2.5 py-1 text-xs font-semibold text-brand-bhagwa hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                >
                  View FDRs
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InstitutionDirectoryPage;
