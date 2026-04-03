'use client';

/**
 * @file hooks/useBudget.ts
 * @description Hook for budget CRUD and real-time status.
 *   Provides:
 *     budgets       — raw budget documents for current month
 *     budgetStatus  — enriched status objects (spent, %, remaining, status)
 *     isLoading     — fetching state
 *     fetchBudgets  — reload budgets for a given monthYear
 *     fetchStatus   — reload status (called on 60-second interval)
 *     setBudget     — create/update a budget (upsert)
 *   Side effects:
 *     - Polls /api/budgets/status every 60 seconds
 *     - Shows toast warnings when categories cross 80% or 100% thresholds
 * Connected to: lib/api.ts, budget/page.tsx, dashboard/page.tsx, BudgetAlertBanner.tsx
 * Owner: Frontend Developer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast }                                     from 'sonner';
import { format }                                    from 'date-fns';
import api                                           from '@/lib/api';
import type { ApiResponse }                          from '@/types';
import type { ExpenseCategory }                      from './useExpenses';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Raw budget document from GET /api/budgets */
export interface Budget {
  _id:         string;
  userId:      string;
  category:    ExpenseCategory;
  monthYear:   string;
  limitAmount: number;
  createdAt:   string;
}

/** Enriched budget status from GET /api/budgets/status */
export interface BudgetStatus {
  budgetId:       string;
  category:       ExpenseCategory;
  limitAmount:    number;
  totalSpent:     number;
  remaining:      number;
  percentageUsed: number;
  status:         'safe' | 'warning' | 'exceeded';
  monthYear:      string;
}

/** Payload for creating/updating a budget */
export interface SetBudgetPayload {
  category:    ExpenseCategory;
  limitAmount: number;
  monthYear?:  string;
}

interface UseBudgetReturn {
  budgets:       Budget[];
  budgetStatus:  BudgetStatus[];
  isLoading:     boolean;
  monthYear:     string;
  setMonthYear:  (m: string) => void;
  fetchBudgets:  () => Promise<void>;
  fetchStatus:   () => Promise<void>;
  setBudget:     (p: SetBudgetPayload) => Promise<boolean>;
}

// ─── Previously-notified tracking (per session) ───────────────────────────────
// Prevents spamming the same toast every 60 seconds
const notifiedCategories = new Set<string>();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBudget(): UseBudgetReturn {
  const [budgets,      setBudgets]      = useState<Budget[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [monthYear,    setMonthYear]    = useState(format(new Date(), 'yyyy-MM'));

  // Keep a ref to the latest budgetStatus for the polling callback
  const statusRef = useRef<BudgetStatus[]>([]);
  statusRef.current = budgetStatus;

  /* ── Fetch raw budgets ──────────────────────────────────────────── */
  const fetchBudgets = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: res } = await api.get<ApiResponse<{ budgets: Budget[] }>>(
        `/api/budgets?monthYear=${monthYear}`,
      );
      setBudgets(res.data.budgets);
    } catch {
      toast.error('Failed to load budgets.');
    } finally {
      setIsLoading(false);
    }
  }, [monthYear]);

  /* ── Fetch enriched status for each budget category ─────────────── */
  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      const { data: res } = await api.get<ApiResponse<{ statuses: BudgetStatus[] }>>(
        `/api/budgets/status?monthYear=${monthYear}`,
      );
      const statuses = res.data.statuses;
      setBudgetStatus(statuses);

      // ── Toast notifications on threshold crosses ──────────────────
      statuses.forEach(s => {
        const key = `${s.category}-${s.monthYear}`;

        if (s.status === 'exceeded' && !notifiedCategories.has(`exceeded-${key}`)) {
          toast.error(`🚨 ${s.category} budget exceeded! (${s.percentageUsed}% used)`, {
            duration: 6000,
          });
          notifiedCategories.add(`exceeded-${key}`);
        } else if (s.status === 'warning' && !notifiedCategories.has(`warning-${key}`)) {
          toast.warning(`⚠️ ${s.category} budget at ${s.percentageUsed}%. Limit: soon.`, {
            duration: 5000,
          });
          notifiedCategories.add(`warning-${key}`);
        }
      });
    } catch {
      // Silently fail — polling shouldn't disrupt the user
    }
  }, [monthYear]);

  /* ── Initial fetch on mount + when monthYear changes ─────────────── */
  useEffect(() => {
    fetchBudgets();
    fetchStatus();
  }, [fetchBudgets, fetchStatus]);

  /* ── Poll status every 60 seconds while component is mounted ─────── */
  useEffect(() => {
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  /* ── Set (create or update) a budget ─────────────────────────────── */
  /**
   * Calls POST /api/budgets (upsert — backend uses findOneAndUpdate).
   * @param payload - { category, limitAmount, monthYear? }
   * @returns true on success
   */
  const setBudget = useCallback(async (payload: SetBudgetPayload): Promise<boolean> => {
    try {
      await api.post('/api/budgets', {
        ...payload,
        monthYear: payload.monthYear ?? monthYear,
      });
      toast.success(`Budget for ${payload.category} saved.`);
      await Promise.all([fetchBudgets(), fetchStatus()]);
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to save budget.';
      toast.error(msg);
      return false;
    }
  }, [monthYear, fetchBudgets, fetchStatus]);

  return {
    budgets, budgetStatus, isLoading,
    monthYear, setMonthYear,
    fetchBudgets, fetchStatus, setBudget,
  };
}
