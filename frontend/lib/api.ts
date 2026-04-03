/**
 * @file lib/api.ts
 * @description Axios instance pre-configured for FinTrack API calls.
 *   - Base URL pulled from NEXT_PUBLIC_API_URL env variable
 *   - Request interceptor: attaches JWT token from localStorage to every request
 *   - Response interceptor: on 401 Unauthorized → clears token and redirects to /login
 *   - All responses unwrap to the ApiResponse<T> shape
 * Connected to: hooks/useAuth.ts, all feature API modules
 * Owner: Frontend Developer
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/* ── Create Axios Instance ─────────────────────────────────────────── */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000, // 15 second timeout
});

/* ── Request Interceptor ───────────────────────────────────────────── */
/**
 * Runs before every outgoing request.
 * Reads the JWT token from localStorage and attaches it as a Bearer token.
 * If no token exists, the request is sent without Authorization header.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only access localStorage on the client side (Next.js SSR guard)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('fintrack_token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/* ── Response Interceptor ──────────────────────────────────────────── */
/**
 * Runs on every API response.
 * On 401 Unauthorized: clears auth data and hard-redirects to /login.
 * Other errors are passed through to the calling code for handling.
 */
api.interceptors.response.use(
  // Success path — pass through unchanged
  response => response,

  // Error path
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stale auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');
        // Hard redirect — not a Next.js router push, to clear all in-memory state
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

/* ── Python AI Service Instance ────────────────────────────────────── */
/**
 * Separate Axios instance pointing at the Flask/Python AI service.
 * Used only by analytics/suggestion hooks.
 */
export const aiApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PYTHON_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000, // AI analysis may take longer
});
