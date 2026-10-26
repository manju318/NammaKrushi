import api from './api';

export const mandiService = {
  /**
   * Retrieve list of APMC mandis with optional search query or district.
   */
  getMandis: async (params = {}) => {
    return api.get('/mandis', { params });
  },

  /**
   * Retrieve specific mandi details by ID.
   */
  getMandiById: async (id) => {
    return api.get(`/mandis/${id}`);
  },
};
