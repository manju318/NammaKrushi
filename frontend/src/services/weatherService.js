import api from './api';

export const weatherService = {
  getCurrent: async (lat, lon, location) => {
    const params = {};
    if (lat !== undefined && lon !== undefined) {
      params.lat = lat;
      params.lon = lon;
    }
    if (location) params.location = location;
    return api.get('/weather/current', { params });
  },

  getForecast: async (lat, lon) => {
    const params = {};
    if (lat !== undefined && lon !== undefined) {
      params.lat = lat;
      params.lon = lon;
    }
    return api.get('/weather/forecast', { params });
  },

  geocode: async (query) => {
    return api.get('/weather/geocode', { params: { query } });
  },

  reverseGeocode: async (lat, lon) => {
    return api.get('/weather/reverse', { params: { lat, lon } });
  }
};
