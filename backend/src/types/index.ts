/**
 * @file src/types/index.ts
 * @description Shared TypeScript interfaces for the FinTrack backend.
 *   These types enforce consistency across controllers, services, and middleware.
 *   Frontend mirrors these in frontend/types/index.ts.
 * Owner: Backend Developer
 */

import { Request } from 'express';
import { IUser }   from '../models/User';

// ─── API Response Shape (all endpoints must use this) ────────────────────────

/** Standard API response wrapper — NO endpoint may return raw data */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data:    T;
  message: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Extends Express Request to include authenticated user */
export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: IUser;
}

/** JWT payload encoded into the token */
export interface JwtPayload {
  id:    string;
  email: string;
  role:  'user' | 'admin';
  iat:   number;
  exp:   number;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Food' | 'Rent' | 'Shopping' | 'Travel'
  | 'Entertainment' | 'Health' | 'Education'
  | 'Utilities' | 'Other';

export type PaymentMethod =
  | 'UPI' | 'Credit Card' | 'Debit Card'
  | 'Cash' | 'Net Banking' | 'Other';

/** POST /api/expenses body after validation */
export interface CreateExpenseDto {
  amount:        number;
  category:      ExpenseCategory;
  date:          string;
  paymentMethod: PaymentMethod;
  notes?:        string;
  isRecurring:   boolean;
  recurringDay?: number;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

/** POST /api/budgets body */
export interface CreateBudgetDto {
  category:    ExpenseCategory;
  limitAmount: number;
  monthYear?:  string;
}

/** Status object computed by getBudgetStatus */
export interface BudgetStatusItem {
  budgetId:       string;
  category:       ExpenseCategory;
  limitAmount:    number;
  totalSpent:     number;
  remaining:      number;
  percentageUsed: number;
  status:         'safe' | 'warning' | 'exceeded';
  monthYear:      string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalSpentThisMonth:  number;
  totalSpentLastMonth:  number;
  monthOverMonthChange: number;
  topCategory:          string | null;
  topCategoryAmount:    number;
  totalExpensesCount:   number;
  topPaymentMethods:    { method: string; count: number; total: number }[];
}

export interface CategoryBreakdownItem {
  category:   ExpenseCategory;
  total:      number;
  percentage: number;
  color:      string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

/** Deserialized MonthlyReport (JSON fields parsed) */
export interface MonthlyReportDto {
  id:                   number;
  userId:               string;
  month:                string;
  totalSpent:           number;
  totalTransactions:    number;
  topCategory:          string | null;
  topPaymentMethod:     string | null;
  overbudgetCategories: string[];
  categoryBreakdown:    Record<string, number>;
  savingsRate:          number;
  createdAt:            string;
}

// ─── AI Suggestions ───────────────────────────────────────────────────────────

export type SuggestionSeverity = 'info' | 'warning' | 'danger' | 'success' | 'low';

export interface SpendingSuggestion {
  type:              string;
  category:          string;
  message:           string;
  severity:          SuggestionSeverity;
  saving_tip?:       string;
  potential_savings: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food:          '#F97316',
  Rent:          '#EF4444',
  Shopping:      '#EC4899',
  Travel:        '#3B82F6',
  Entertainment: '#8B5CF6',
  Health:        '#10B981',
  Education:     '#06B6D4',
  Utilities:     '#F59E0B',
  Other:         '#6B7280',
};

export const THEME_COLORS = {
  primary:    '#6366F1',
  success:    '#10B981',
  warning:    '#F59E0B',
  danger:     '#EF4444',
  bgMain:     '#0F172A',
  bgCard:     '#1E293B',
  textPrimary:'#F1F5F9',
  textMuted:  '#94A3B8',
} as const;
