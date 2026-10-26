import api from './api';

export const paymentService = {
  /**
   * Create a Razorpay order server-side.
   * Returns: { gateway_order_id, key_id, amount, currency, transaction_id, farmer_settlement }
   */
  createPaymentIntent: async (orderId, paymentMethod = 'UPI') => {
    return api.post('/payments/create', { order_id: orderId, payment_method: paymentMethod });
  },

  /**
   * Verify Razorpay payment server-side via HMAC-SHA256 signature check.
   */
  verifyPayment: async (verificationData) => {
    return api.post('/payments/verify', verificationData);
  },

  /**
   * Farmer payment destination management.
   */
  registerDestination: async (destinationData) => {
    return api.post('/payments/destination', destinationData);
  },

  getDestination: async (farmerId = null) => {
    return api.get('/payments/destination', {
      params: farmerId ? { farmer_id: farmerId } : {},
    });
  },

  /**
   * Upload genuine UPI QR code image file.
   */
  uploadQrCode: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/payments/upload-qr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Issue refund for cancelled / disputed order.
   */
  issueRefund: async (orderId, reason) => {
    return api.post('/payments/refund', { order_id: orderId, reason });
  },
};
