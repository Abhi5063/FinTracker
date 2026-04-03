/**
 * @file lib/auth.ts
 * @description Client-side authentication helper functions.
 *   Provides utilities for reading/writing auth state in localStorage,
 *   checking token validity, and getting the current user.
 *   These are pure helpers — stateful logic lives in hooks/useAuth.ts.
 * Connected to: hooks/useAuth.ts, lib/api.ts interceptors, Navbar.tsx
 * Owner: Frontend Developer
 */

import type { User } from '@/types';

const TOKEN_KEY = 'fintrack_token';
const USER_KEY  = 'fintrack_user';

// ─── Token Helpers ────────────────────────────────────────────────────────────

/**
 * Reads the JWT from localStorage.
 * Returns null if running on the server or if no token exists.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Persists the JWT token to localStorage.
 * @param token - The raw JWT string returned from the API
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Removes the JWT token from localStorage (called on logout).
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// ─── User Helpers ─────────────────────────────────────────────────────────────

/**
 * Reads the serialised User object from localStorage.
 * Returns null on server or if no user is stored.
 * @returns Parsed User object or null
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    // Corrupted JSON — clear it
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

/**
 * Stores the User object in localStorage as JSON.
 * @param user - The User object returned from the API
 */
export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Removes both token and user from localStorage (full logout).
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Token Validity ───────────────────────────────────────────────────────────

/**
 * Checks whether the stored JWT is likely still valid by decoding its payload
 * and comparing the exp claim to the current time.
 * Note: This is a client-side optimistic check only — the server always
 * performs a real cryptographic verification.
 * @returns true if token exists and is not expired, false otherwise
 */
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // JWT structure: header.payload.signature — we only need the payload
    const parts   = token.split('.');
    if (parts.length !== 3) return false;

    // Decode Base64Url-encoded payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // exp is in seconds; Date.now() is in milliseconds
    const isExpired = payload.exp ? Date.now() >= payload.exp * 1000 : false;
    return !isExpired;
  } catch {
    return false; // Malformed token
  }
}

/**
 * Convenience check: is the user currently authenticated?
 * Combines token existence + validity check.
 */
export function isAuthenticated(): boolean {
  return isTokenValid();
}
