'use client';

/**
 * @file hooks/useExpenses.ts
 * @description Hook managing expense CRUD operations + filter/pagination state.
 *   Provides:
 *     expenses      — paginated array for current filter state
 *     pagination    — { total, page, limit, totalPages }
 *     isLoading     — true while fetching
 *     error         — last error message
 *     filters       — current active filter values
 *     setFilters    — update filters (resets to page 1)
 *     createExpense — POST /api/expenses
 *     updateExpense — PUT /api/expenses/:id
 *     deleteExpense — DELETE /api/expenses/:id
 *     exportCSV     — triggers browser download via GET /api/expenses/export
 *     refetch       — re-run the current query
 * Connected to: lib/api.ts, expenses/page.tsx, AddExpenseModal.tsx
 * Owner: Frontend Developer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast }                                     from 'sonner';
import api                                           from '@/lib/api';
import type { ApiResponse }                          from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Food' | 'Rent' | 'Shopping' | 'Travel'
  | 'Entertainment' | 'Health' | 'Education'
  | 'Utilities' | 'Other';

export type PaymentMethod =
  | 'UPI' | 'Credit Card' | 'Debit Card'
  | 'Cash' | 'Net Banking' | 'Other';

/** A single expense document from the API */
export interface Expense {
  _id:           string;
  userId:        string;
  amount:        number;
  category:      ExpenseCategory;
  date:          string;          // ISO date string
  paymentMethod: PaymentMethod;
  notes?:        string;
  isRecurring:   boolean;
  recurringDay?: number;
  createdAt:     string;
  updatedAt:     string;
}

/** Filters applied to the expense list query */
export interface ExpenseFilters {
  category?:      ExpenseCategory | '';
  paymentMethod?: PaymentMethod   | '';
  startDate?:     string;
  endDate?:       string;
  search?:        string;
  page:           number;
  limit:          number;
}

/** Pagination metadata returned by the API */
export interface PaginationMeta {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

/** Payload for creating or updating an expense */
export interface CreateExpensePayload {
  amount:        number;
  category:      ExpenseCategory;
  date:          string;
  paymentMethod: PaymentMethod;
  notes?:        string;
  isRecurring:   boolean;
  recurringDay?: number;
}

// ─── Hook Return Type ─────────────────────────────────────────────────────────

interface UseExpensesReturn {
  expenses:     Expense[];
  pagination:   PaginationMeta | null;
  isLoading:    boolean;
  error:        string | null;
  filters:      ExpenseFilters;
  setFilters:   (f: Partial<ExpenseFilters>) => void;
  createExpense:(p: CreateExpensePayload) => Promise<boolean>;
  updateExpense:(id: string, p: Partial<CreateExpensePayload>) => Promise<boolean>;
  deleteExpense:(id: string) => Promise<boolean>;
  exportCSV:    () => Promise<void>;
  refetch:      () => void;
}

// ─── Default Filters ──────────────────────────────────────────────────────────

const DEFAULT_FILTERS: ExpenseFilters = {
  category:      '',
  paymentMethod: '',
  startDate:     '',
  endDate:       '',
  search:        '',
  page:          1,
  limit:         10,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExpenses(): UseExpensesReturn {
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [filters,    setFiltersRaw] = useState<ExpenseFilters>(DEFAULT_FILTERS);

  // Track latest fetch to avoid stale-closure race conditions
  const fetchIdRef   = useRef(0);
  // Debounce timer for search input
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch Expenses ─────────────────────────────────────────────── */
  const fetchExpenses = useCallback(async (f: ExpenseFilters) => {
    setIsLoading(true);
    setError(null);

    const fetchId = ++fetchIdRef.current;

    try {
      // Build query string from filters, omitting empty values
      const params = new URLSearchParams();
      if (f.category)      params.set('category',      f.category);
      if (f.paymentMethod) params.set('paymentMethod',  f.paymentMethod);
      if (f.startDate)     params.set('startDate',      f.startDate);
      if (f.endDate)       params.set('endDate',        f.endDate);
      if (f.search)        params.set('search',         f.search);
      params.set('page',  String(f.page));
      params.set('limit', String(f.limit));

      const { data: res } = await api.get<ApiResponse<{
        expenses:   Expense[];
        pagination: PaginationMeta;
      }>>(`/api/expenses?${params.toString()}`);

      // Only update state if this is still the latest fetch
      if (fetchId === fetchIdRef.current) {
        setExpenses(res.data.expenses);
        setPagination(res.data.pagination);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load expenses.';
      if (fetchId === fetchIdRef.current) setError(msg);
    } finally {
      if (fetchId === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  /* ── Trigger fetch on filter change (with 300ms debounce for search) */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchExpenses(filters), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters, fetchExpenses]);

  /* ── Update filters helper — resets to page 1 on filter change ─── */
  const setFilters = useCallback((partial: Partial<ExpenseFilters>) => {
    setFiltersRaw(prev => ({
      ...prev,
      ...partial,
      // Reset to page 1 whenever any filter other than page changes
      page: 'page' in partial ? (partial.page ?? 1) : 1,
    }));
  }, []);

  /* ── Create Expense ─────────────────────────────────────────────── */
  /**
   * POSTs a new expense to the API.
   * @returns true on success, false on failure (error is shown via toast)
   */
  const createExpense = useCallback(async (payload: CreateExpensePayload): Promise<boolean> => {
    try {
      await api.post('/api/expenses', payload);
      toast.success('Expense added successfully!');
      setFiltersRaw(prev => ({ ...prev })); // Trigger refetch
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create expense.';
      toast.error(msg);
      return false;
    }
  }, []);

  /* ── Update Expense ─────────────────────────────────────────────── */
  /**
   * PUTs updated fields to an existing expense.
   * @param id      - Expense MongoDB _id
   * @param payload - Partial update payload
   * @returns true on success
   */
  const updateExpense = useCallback(async (id: string, payload: Partial<CreateExpensePayload>): Promise<boolean> => {
    try {
      await api.put(`/api/expenses/${id}`, payload);
      toast.success('Expense updated successfully!');
      setFiltersRaw(prev => ({ ...prev }));
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update expense.';
      toast.error(msg);
      return false;
    }
  }, []);

  /* ── Delete Expense ─────────────────────────────────────────────── */
  /**
   * DELETEs an expense by ID.
   * @param id - Expense MongoDB _id
   * @returns true on success
   */
  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/expenses/${id}`);
      toast.success('Expense deleted.');
      setFiltersRaw(prev => ({ ...prev }));
      return true;
    } catch (err: unknown) {
      toast.error('Failed to delete expense.');
      return false;
    }
  }, []);

  /* ── Export CSV ──────────────────────────────────────────────────── */
  /**
   * Calls GET /api/expenses/export, receives CSV text,
   * and triggers a browser file download.
   */
  const exportCSV = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get('/api/expenses/export', {
        responseType: 'text',
      });
      const blob   = new Blob([response.data as string], { type: 'text/csv' });
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href  = url;
      anchor.setAttribute('download', 'fintrack_expenses.csv');
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('Expenses exported as CSV.');
    } catch {
      toast.error('Failed to export expenses.');
    }
  }, []);

  /* ── Manual refetch ─────────────────────────────────────────────── */
  const refetch = useCallback(() => {
    setFiltersRaw(prev => ({ ...prev }));
  }, []);

  return {
    expenses, pagination, isLoading, error,
    filters, setFilters,
    createExpense, updateExpense, deleteExpense,
    exportCSV, refetch,
  };
}
