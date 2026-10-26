import api from './api';

export const requestService = {
  /**
   * Submit a product-specific purchase request to the authentic farmer.
   */
  createRequest: async (requestData) => {
    return api.post('/requests', requestData);
  },

  /**
   * Retrieve purchase requests filtered by user role (Farmer or Buyer).
   */
  getRequests: async (params = {}) => {
    return api.get('/requests', { params });
  },

  /**
   * Retrieve specific request details.
   */
  getRequestById: async (id) => {
    return api.get(`/requests/${id}`);
  },

  /**
   * Farmer responds to a request: 'Accepted', 'Rejected', or 'Negotiation'.
   */
  respondToRequest: async (id, action, farmerNotes = '', counterUnitPrice = null, counterQuantity = null) => {
    return api.post(`/requests/${id}/respond`, {
      action,
      farmer_notes: farmerNotes,
      counter_unit_price: counterUnitPrice,
      counter_quantity: counterQuantity,
    });
  },

  /**
   * Buyer responds to a farmer's counter offer ('accept_counter' or 'cancel').
   */
  buyerRespond: async (id, action) => {
    return api.post(`/requests/${id}/buyer-respond`, { action });
  },

  /**
   * Convert an accepted purchase request into an official Order.
   */
  convertToOrder: async (id, orderData = {}) => {
    return api.post(`/requests/${id}/convert-to-order`, orderData);
  },
};
