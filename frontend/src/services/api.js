// client/src/services/api.js
import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Auto-attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tapchetna_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Weather & OpenStreetMap endpoints
export const searchPlacesOSM = (query) => api.get(`/weather/search?q=${encodeURIComponent(query)}`);
export const reverseGeocodeCoords = (lat, lon) => api.get(`/weather/reverse?lat=${lat}&lon=${lon}`);
export const getCurrentWeather = (location, coords = null) => {
  let url = `/weather/current?location=${encodeURIComponent(location)}`;
  if (coords && coords.lat && coords.lon) {
    url += `&lat=${coords.lat}&lon=${coords.lon}`;
  }
  return api.get(url);
};
export const getWeatherForecast = (location, coords = null) => {
  let url = `/weather/forecast?location=${encodeURIComponent(location)}`;
  if (coords && coords.lat && coords.lon) {
    url += `&lat=${coords.lat}&lon=${coords.lon}`;
  }
  return api.get(url);
};

// Citizen endpoints
export const getCitizenProfile = () => api.get('/citizen/profile');
export const updateCitizenProfile = (data) => api.put('/citizen/profile', data);
export const calculatePersonalRisk = (data) => api.post('/citizen/calculate-risk', data);

// Travel Transition endpoints
export const checkTravelRisk = (data) => api.post('/travel/check', data);
export const checkTravel = checkTravelRisk;

// What-If Planner endpoints
export const compareWhatIfSlots = (data) => api.post('/whatif/compare', data);

// Authority endpoints
export const getAuthorityDashboard = () => api.get('/authority/dashboard');
export const getAuthorityWards = () => api.get('/authority/wards');
export const getAuthorityAlerts = () => api.get('/authority/alerts');
export const createAuthorityAlert = (data) => api.post('/authority/alerts', data);
export const updateAuthorityAlert = (id, data) => api.put(`/authority/alerts/${id}`, data);
export const getAuthorityRecommendations = () => api.get('/authority/recommendations');

// Admin endpoints
export const getAdminRequests = () => api.get('/admin/requests');
export const approveAdminRequest = (id) => api.post(`/admin/requests/${id}/approve`);
export const rejectAdminRequest = (id) => api.post(`/admin/requests/${id}/reject`);
export const getAdminAuthorities = () => api.get('/admin/authorities');
export const updateAdminAuthority = (id, data) => api.put(`/admin/authorities/${id}`, data);
export const createAdminAuthority = (data) => api.post('/admin/authorities', data);

export default api;
