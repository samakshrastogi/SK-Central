import axios from 'axios';

let apiNetworkCooldownUntil = 0;
const networkCooldownMs = 20_000;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4002/api',
  withCredentials: true,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase() ?? 'get';
  if (method === 'get' && Date.now() < apiNetworkCooldownUntil) {
    return Promise.reject(new axios.CanceledError('API network cooldown active'));
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!axios.isCancel(error) && !error?.response) {
      apiNetworkCooldownUntil = Date.now() + networkCooldownMs;
    }
    return Promise.reject(error);
  }
);
