import api from './api';

export const cropService = {
  predictCrop: async (soilAndClimateData) => {
    return api.post('/crop/predict', soilAndClimateData);
  },

  getHistory: async () => {
    return api.get('/crop/history');
  },

  getMetrics: async () => {
    return api.get('/crop/metrics');
  }
};
