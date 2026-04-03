'use client';

/**
 * @file hooks/useAuth.ts
 * @description Custom React hook for all authentication state and actions.
 *   Provides:
 *     - user        : Current User object or null
 *     - isLoading   : true while any auth request is in-flight
 *     - isAuthenticated : true when a valid token + user exist
 *     - error       : Last error message from a failed auth call
 *     - login()     : POST /api/auth/login → stores token + user
 *     - register()  : POST /api/auth/register → stores token + user
 *     - logout()    : Clears localStorage and redirects to /login
 *     - clearError(): Clears the error state
 * Connected to: lib/api.ts, lib/auth.ts, login/page.tsx, register/page.tsx
 * Owner: Frontend Developer
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter }                         from 'next/navigation';
import { toast }                             from 'sonner';
import api                                   from '@/lib/api';
import {
  getToken, setToken, getStoredUser, setStoredUser,
  clearAuth, isTokenValid,
} from '@/lib/auth';
import type {
  User, LoginPayload, RegisterPayload,
  AuthResponse, ApiResponse,
} from '@/types';

/* ── Return Type Interface ────────────────────────────────────────── */
interface UseAuthReturn {
  user:            User | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  error:           string | null;
  login:           (payload: LoginPayload)    => Promise<void>;
  register:        (payload: RegisterPayload) => Promise<void>;
  logout:          ()                         => void;
  clearError:      ()                         => void;
}

/* ── Hook Implementation ──────────────────────────────────────────── */
export function useAuth(): UseAuthReturn {
  const router = useRouter();

  /* ── State ─────────────────────────────────────────────────────── */
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // true on first load
  const [error,     setError]     = useState<string | null>(null);

  /* ── Hydrate from localStorage on component mount ────────────────
   * We initialise isLoading=true so pages can show a spinner until
   * we know whether the user is logged in or not.
   * ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const storedUser = getStoredUser();
    const tokenValid = isTokenValid();

    if (storedUser && tokenValid) {
      setUser(storedUser);
    } else if (storedUser && !tokenValid) {
      // Token expired — clear stale auth and kick to login
      clearAuth();
    }

    setIsLoading(false);
  }, []);

  /* ── Derived: is the user authenticated? ─────────────────────────
   * True only when we have both a valid token AND a loaded user object.
   * ─────────────────────────────────────────────────────────────── */
  const isAuthenticated = user !== null && isTokenValid();

  /* ── login() ─────────────────────────────────────────────────────
   * @param payload - { email, password, rememberMe? }
   * Calls POST /api/auth/login.
   * On success: stores token + user, redirects to /dashboard.
   * On failure: sets error message.
   * ─────────────────────────────────────────────────────────────── */
  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: res } = await api.post<ApiResponse<AuthResponse>>(
        '/api/auth/login',
        { email: payload.email, password: payload.password },
      );

      if (!res.success) {
        throw new Error(res.message || 'Login failed. Please try again.');
      }

      // Persist token and user to localStorage
      setToken(res.data.token);
      setStoredUser(res.data.user);
      setUser(res.data.user);

      toast.success(`Welcome back, ${res.data.user.name?.split(' ')[0] || 'User'}! 👋`);
      router.push('/dashboard');

    } catch (err: unknown) {
      // Extract error message from Axios error or generic Error
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? 'Login failed. Please check your credentials.';

      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  /* ── register() ──────────────────────────────────────────────────
   * @param payload - { name, email, password, confirmPassword }
   * Calls POST /api/auth/register.
   * On success: stores token + user, redirects to /dashboard.
   * On failure: sets error message.
   * ─────────────────────────────────────────────────────────────── */
  const register = useCallback(async (payload: RegisterPayload): Promise<void> => {
    // Client-side validation before hitting the server
    if (payload.password !== payload.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (payload.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: res } = await api.post<ApiResponse<AuthResponse>>(
        '/api/auth/register',
        { name: payload.name, email: payload.email, password: payload.password },
      );

      if (!res.success) {
        throw new Error(res.message || 'Registration failed. Please try again.');
      }

      // Persist token and user
      setToken(res.data.token);
      setStoredUser(res.data.user);
      setUser(res.data.user);

      toast.success(`Account created! Welcome to FinTrack, ${res.data.user.name?.split(' ')[0] || 'User'}! 🎉`);
      router.push('/dashboard');

    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? 'Registration failed. Please try again.';

      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  /* ── logout() ────────────────────────────────────────────────────
   * Clears all auth state from localStorage, resets hook state,
   * and redirects to the login page.
   * ─────────────────────────────────────────────────────────────── */
  const logout = useCallback((): void => {
    clearAuth();
    setUser(null);
    toast.info('You have been signed out.');
    router.push('/login');
  }, [router]);

  /* ── clearError() ────────────────────────────────────────────────
   * Resets the error state — called when the user starts typing again.
   */
  const clearError = useCallback((): void => setError(null), []);

  return { user, isLoading, isAuthenticated, error, login, register, logout, clearError };
}
