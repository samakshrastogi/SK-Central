import axios from 'axios';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4002/api';
const apiBaseUrl = import.meta.env.PROD && configuredApiBaseUrl.includes('sk-central.onrender.com') ? '/api' : configuredApiBaseUrl;

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json'
  }
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);


