import api from './api';

export const authService = {
  login: async (email, password) => {
    return api.post('/auth/login', { email, password });
  },

  register: async (userData) => {
    return api.post('/auth/register', userData);
  },

  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  logout: async () => {
    return api.post('/auth/logout');
  }
};
