import api from './api';

export const orderService = {
  createOrder: async (orderData) => api.post('/orders', orderData),
  getOrders: async () => api.get('/orders'),
  getOrderById: async (id) => api.get(`/orders/${id}`),
};
