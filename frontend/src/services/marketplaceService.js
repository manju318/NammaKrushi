import api from './api';

export const marketplaceService = {
  getProducts: async (params = {}) => api.get('/products', { params }),
  getProductById: async (id) => api.get(`/products/${id}`),
  createProduct: async (productData) => api.post('/products', productData),
  updateProduct: async (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: async (id) => api.delete(`/products/${id}`),

  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getFarmerSuggestions: async () => api.get('/products/suggestions/farmer'),
  getBuyerRecommendations: async (params = {}) => api.get('/products/suggestions/buyer', { params }),
};
