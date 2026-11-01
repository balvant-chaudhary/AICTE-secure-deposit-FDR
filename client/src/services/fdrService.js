import api from './api';

export const fdrService = {
  /**
   * Fetch FDR records with optional filters and pagination
   */
  getFDRs: async (params = {}) => {
    const res = await api.get('/fdrs', { params });
    return res.data;
  },

  /**
   * Fetch specific FDR record by ID
   */
  getFDRById: async (id) => {
    const res = await api.get(`/fdrs/${id}`);
    return res.data;
  },

  /**
   * Submit new FDR record with document attachment (multipart/form-data)
   */
  submitFDR: async (formData) => {
    const res = await api.post('/fdrs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  /**
   * Update existing FDR record (allowed when SUBMITTED or DISCREPANCY_FLAGGED)
   */
  updateFDR: async (id, data, isMultipart = false) => {
    const res = await api.put(`/fdrs/${id}`, data, {
      headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data;
  },

  /**
   * Securely download FDR certificate/scan through authenticated endpoint
   */
  downloadDocument: async (id, originalName = 'fdr-document.pdf') => {
    const res = await api.get(`/fdrs/${id}/download-document`, {
      responseType: 'blob'
    });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  }
};

export default fdrService;
