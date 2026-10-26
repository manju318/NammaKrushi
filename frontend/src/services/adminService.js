import api from './api';

export const adminService = {
  getDashboardStats: async () => api.get('/admin/dashboard'),
  getProductQueue: async (status = null) => api.get('/admin/products/queue', { params: status ? { status } : {} }),
  moderateProduct: async (productId, action, reason = '') =>
    api.post(`/admin/products/${productId}/moderate`, { action, reason }),

  getPaymentDestinations: async () => api.get('/admin/destinations'),
  verifyPaymentDestination: async (destId, status, reason = '') =>
    api.post(`/admin/destinations/${destId}/verify`, { status, reason }),

  getPurchaseRequests: async (status = null) =>
    api.get('/admin/requests', { params: status ? { status } : {} }),

  getTransactions: async () => api.get('/admin/transactions'),
  getDisputes: async () => api.get('/admin/disputes'),
  resolveDispute: async (disputeId, status, resolutionNotes = '') =>
    api.post(`/admin/disputes/${disputeId}/resolve`, { status, resolution_notes: resolutionNotes }),

  getAuditLogs: async () => api.get('/admin/audit-logs'),
  updateUserStatus: async (userId, isActive, reason = '') =>
    api.post(`/admin/users/${userId}/status`, { is_active: isActive, reason }),

  getSellers: async () => api.get('/admin/sellers'),
  verifySeller: async (sellerId, status, remarks = '') =>
    api.post(`/admin/sellers/${sellerId}/verify`, { status, remarks }),

  getUsers: async () => api.get('/admin/users'),
};
