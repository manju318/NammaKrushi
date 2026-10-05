import api from './api';

export const paymentService = {
  createPaymentIntent: async (orderId, paymentMethod) => {
    return api.post('/payments/create', { order_id: orderId, payment_method: paymentMethod });
  },

  verifyPayment: async (verificationData) => {
    return api.post('/payments/verify', verificationData);
  },
};
