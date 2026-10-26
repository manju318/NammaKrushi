import api from './api';

export const aiService = {
  chat: async (message, context = {}) => {
    return api.post('/ai/chat', { message, ...context }, { timeout: 60000 });
  },

  getHistory: async () => {
    return api.get('/ai/history');
  },
};

export const adminService = {
  getDashboardStats: async () => api.get('/admin/dashboard'),
  getUsers: async () => api.get('/admin/users'),
  getSellers: async () => api.get('/admin/sellers'),
  verifySeller: async (sellerId, status, remarks) => api.post(`/admin/sellers/${sellerId}/verify`, { status, remarks }),
  approveProduct: async (productId, isApproved) => api.post(`/admin/products/${productId}/approve`, { is_approved: isApproved }),
  verifyPayment: async (paymentId) => api.post(`/admin/payments/${paymentId}/verify`),
};
