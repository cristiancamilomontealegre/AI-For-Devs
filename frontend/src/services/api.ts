import axios from 'axios';
import { parseApiError, parseAxiosApiError } from '../utils/api-error';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(new Error(parseAxiosApiError(error)));
    }

    return Promise.reject(new Error(parseApiError(error)));
  },
);
