import axios from 'axios';

// Production uses the same Railway domain for the SPA and API. Local .env
// files can still override this with http://localhost:3000/api.
const baseURL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export const api = axios.create({
  baseURL,
});

const TOKEN_KEY = 'kuryecrm_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Attach the JWT to every request when present.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, drop the (now invalid) token so the app falls back to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      tokenStorage.clear();
    }
    return Promise.reject(error);
  },
);
