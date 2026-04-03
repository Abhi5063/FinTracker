/**
 * @file types/index.ts
 * @description Central TypeScript type definitions for the FinTrack frontend.
 *   All interfaces shared across components, hooks, and API calls are defined here.
 *   Import from '@/types' anywhere in the app.
 * Connected to: all frontend components, hooks, lib/api.ts
 * Owner: Frontend Developer
 */

import type { ComponentType } from 'react';

// ─── Currency ────────────────────────────────────────────────────────────────

/** Supported ISO 4217 currency codes */
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AED';

// ─── User & Auth Types ────────────────────────────────────────────────────────

/** User role — determines access level */
export type UserRole = 'user' | 'admin';

/**
 * The authenticated user object.
 * Returned on login/register and stored in local auth state.
 * Password is never included.
 */
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;        // Two-character initials string, e.g. "JD"
  currency: CurrencyCode;
  createdAt: string;     // ISO 8601 date string from MongoDB
}

/** Payload for POST /api/auth/login */
export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Payload for POST /api/auth/register */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Shape of the successful auth API response */
export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Generic API Response ─────────────────────────────────────────────────────

/**
 * Standardised wrapper for every backend response.
 * Every endpoint returns this shape: { success, data, message }
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

// ─── Expense Types ────────────────────────────────────────────────────────────

/** Allowed expense categories */
export type ExpenseCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Health & Medical'
  | 'Bills & Utilities'
  | 'Education'
  | 'Travel'
  | 'Investments'
  | 'Other';

/** A single expense document returned from the API */
export interface Expense {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;              // ISO date string, e.g. "2024-04-15T00:00:00.000Z"
  notes?: string;
  isRecurring: boolean;      // Whether the expense repeats every month
  recurringDay?: number;     // Day of month this recurs on (1–31)
  createdAt: string;
  updatedAt: string;
}

/** Request body for creating or updating an expense */
export interface ExpensePayload {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  isRecurring: boolean;
  recurringDay?: number;
}

// ─── Budget Types ─────────────────────────────────────────────────────────────

/** A budget limit per category per month */
export interface Budget {
  _id: string;
  userId: string;
  category: ExpenseCategory;
  limit: number;
  month: number;    // 1–12
  year: number;
  spent: number;    // Derived — calculated from expense collection, not persisted
  createdAt: string;
  updatedAt: string;
}

/** Request body for creating or updating a budget */
export interface BudgetPayload {
  category: ExpenseCategory;
  limit: number;
  month: number;
  year: number;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

/** Monthly summary stored in SQLite via Sequelize */
export interface MonthlyReport {
  id: number;
  userId: string;
  month: number;
  year: number;
  totalSpent: number;
  totalBudget: number;
  topCategory: ExpenseCategory;
  expenseCount: number;
  generatedAt: string;
}

// ─── AI Suggestion Types ──────────────────────────────────────────────────────

/** A single AI-generated spending suggestion from the Python Flask service */
export interface SpendingSuggestion {
  type:               string;
  category:           string;
  message:            string;
  severity:           'info' | 'warning' | 'danger' | 'success' | 'low';
  saving_tip?:        string;
  potential_savings:  number;
  /** @deprecated use potential_savings */
  potentialSaving?:   number;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

/** Data shape for animated stat cards on the dashboard */
export interface StatCard {
  label: string;
  value: number;
  change: number;             // Percentage change vs prior month (can be negative)
  changeType: 'increase' | 'decrease';
  prefix?: string;            // Currency symbol, e.g. "₹"
  suffix?: string;
}

// ─── Notification Types ───────────────────────────────────────────────────────

/** In-app notification (e.g. budget exceeded alert) */
export interface AppNotification {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Sidebar Navigation ───────────────────────────────────────────────────────

/** A sidebar navigation link item */
export interface NavItem {
  label: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: ComponentType<{ size?: number; className?: string; [key: string]: any }>;
  badge?: number;   // Optional notification/count badge shown next to the label
}
