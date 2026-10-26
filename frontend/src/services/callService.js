import api from './api';

export const callService = {
  getWebRTCConfig: async () => api.get('/calls/config'),
  requestCall: async (productId) => api.post('/calls/request', { product_id: productId }),
  getIncomingCalls: async () => api.get('/calls/incoming'),
  respondToCall: async (sessionId, action) => api.post(`/calls/${sessionId}/respond`, { action }),
  sendSignal: async (sessionId, signalData) => api.post(`/calls/${sessionId}/signal`, signalData),
  pollCall: async (sessionId) => api.get(`/calls/${sessionId}/poll`),
  endCall: async (sessionId) => api.post(`/calls/${sessionId}/end`),
};
