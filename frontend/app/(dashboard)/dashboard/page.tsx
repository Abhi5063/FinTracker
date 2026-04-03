'use client';

/**
 * @file app/(dashboard)/dashboard/page.tsx
 * @description Main FinTrack dashboard page.
 *   Layout (top → bottom):
 *   ROW 1: 4 animated stat cards (Total Spent, Top Category, Transactions, Budget Health)
 *   ROW 2: Pie chart (Category Breakdown) + Line chart (Daily Spending)
 *   ROW 3: Bar chart (Monthly Comparison — last 6 months)
 *   ROW 4: Budget Alert Banner + AI Suggestions panel
 * Connected to: StatCard, CategoryPieChart, SpendingLineChart, MonthlyBarChart,
 *               BudgetAlertBanner, useBudget.ts, lib/api.ts
 * Owner: Frontend Developer
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Wallet, Tag, BarChart2, ShieldCheck, Lightbulb,
} from 'lucide-react';
import StatCard          from '@/components/dashboard/StatCard';
import CategoryPieChart  from '@/components/charts/CategoryPieChart';
import SpendingLineChart from '@/components/charts/SpendingLineChart';
import MonthlyBarChart   from '@/components/charts/MonthlyBarChart';
import BudgetAlertBanner from '@/components/budget/BudgetAlertBanner';
import { useBudget }     from '@/hooks/useBudget';
import api               from '@/lib/api';
import { cn }            from '@/lib/utils';
import type { ApiResponse, SpendingSuggestion } from '@/types';

// ─── Types for API responses ──────────────────────────────────────────────────

interface DashboardSummary {
  totalSpentThisMonth:  number;
  totalSpentLastMonth:  number;
  monthOverMonthChange: number;
  topCategory:          string | null;
  topCategoryAmount:    number;
  totalExpensesCount:   number;
}

interface CategoryBreakdownItem {
  category:   string;
  total:      number;
  percentage: number;
  color:      string;
}

interface DailySpending { date: string; amount: number; }
interface MonthlyData   { month: string; monthKey: string; amount: number; isCurrent: boolean; }

// ─── Suggestion severity colours ─────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  high:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#F87171' },
  medium:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  text: '#FCD34D' },
  low:     { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#34D399' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { budgetStatus, isLoading: budgetLoading } = useBudget();

  /* ── State ────────────────────────────────────────────────────── */
  const [summary,     setSummary]     = useState<DashboardSummary | null>(null);
  const [breakdown,   setBreakdown]   = useState<CategoryBreakdownItem[]>([]);
  const [trend,       setTrend]       = useState<DailySpending[]>([]);
  const [monthly,     setMonthly]     = useState<MonthlyData[]>([]);
  const [suggestions, setSuggestions] = useState<SpendingSuggestion[]>([]);
  const [loading,     setLoading]     = useState(true);

  /* ── Fetch all dashboard data in parallel ─────────────────────── */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, trendRes, monthRes] = await Promise.all([
        api.get<ApiResponse<DashboardSummary>>('/api/dashboard/summary'),
        api.get<ApiResponse<{ breakdown: CategoryBreakdownItem[] }>>('/api/dashboard/category-breakdown'),
        api.get<ApiResponse<{ trend: DailySpending[] }>>('/api/dashboard/spending-trend'),
        api.get<ApiResponse<{ comparison: MonthlyData[] }>>('/api/dashboard/monthly-comparison'),
      ]);
      setSummary(sumRes.data.data);
      setBreakdown(catRes.data.data.breakdown);
      setTrend(trendRes.data.data.trend);
      setMonthly(monthRes.data.data.comparison);

      /* ── Fetch AI suggestions from Python service ─────────────── */
      try {
        const expRes  = await api.get('/api/expenses?limit=200');
        const expenses = expRes.data.data.expenses;
        const budgets  = Object.fromEntries(budgetStatus.map(b => [b.category, b.limitAmount]));
        const aiRes = await api.post<{ success: boolean; suggestions: SpendingSuggestion[] }>(
          `${process.env.NEXT_PUBLIC_PYTHON_API_URL}/api/analyze`,
          { expenses, budgets },
        );
        if (aiRes.data.success) setSuggestions(aiRes.data.suggestions.slice(0, 4));
      } catch {
        // AI service unavailable — degrade gracefully
      }
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [budgetStatus]);

  useEffect(() => { fetchDashboard(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Budget Health % ─────────────────────────────────────────── */
  const budgetHealth = (() => {
    if (!budgetStatus.length) return 0;
    const avg = budgetStatus.reduce((a, b) => a + b.percentageUsed, 0) / budgetStatus.length;
    return Math.round(Math.min(avg, 100));
  })();

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 stagger loaded">

      {/* ═══ ROW 1: Stat Cards ═══════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Spent"
          value={summary?.totalSpentThisMonth ?? 0}
          prefix="₹"
          subtitle="This month"
          icon={Wallet}
          iconBg="rgba(99,102,241,0.15)"
          trend={Math.abs(summary?.monthOverMonthChange ?? 0)}
          trendType={summary?.monthOverMonthChange && summary.monthOverMonthChange > 0 ? 'up' : 'down'}
          isLoading={loading}
        />
        <StatCard
          title="Top Category"
          value={summary?.topCategoryAmount ?? 0}
          prefix="₹"
          subtitle={summary?.topCategory ?? 'No data'}
          icon={Tag}
          iconBg="rgba(168,85,247,0.15)"
          isLoading={loading}
        />
        <StatCard
          title="Transactions"
          value={summary?.totalExpensesCount ?? 0}
          subtitle="Expenses this month"
          icon={BarChart2}
          iconBg="rgba(16,185,129,0.15)"
          isLoading={loading}
        />
        <StatCard
          title="Budget Health"
          value={budgetHealth}
          suffix="%"
          subtitle={
            budgetHealth >= 100 ? '🚨 Exceeded' :
            budgetHealth >= 80  ? '⚠️ Approaching' :
            '✅ On track'
          }
          icon={ShieldCheck}
          iconBg={budgetHealth >= 80 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}
          isLoading={budgetLoading}
        />
      </div>

      {/* ═══ ROW 2: Pie + Line charts ════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Spending by Category
          </h2>
          <CategoryPieChart data={breakdown} isLoading={loading} />
        </div>

        {/* Line chart */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Daily Spending — Last 30 Days
          </h2>
          <SpendingLineChart data={trend} isLoading={loading} />
        </div>
      </div>

      {/* ═══ ROW 3: Monthly Comparison Bar Chart ════════════════ */}
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Monthly Comparison — Last 6 Months
        </h2>
        <MonthlyBarChart data={monthly} isLoading={loading} />
      </div>

      {/* ═══ ROW 4: Budget Alerts + AI Suggestions ══════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Budget Alerts */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Budget Alerts
          </h2>
          <BudgetAlertBanner statuses={budgetStatus} />
          {budgetStatus.filter(s => s.status === 'safe').length === budgetStatus.length && budgetStatus.length > 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="text-3xl">🎉</span>
              <p className="text-sm font-medium" style={{ color: '#34D399' }}>All budgets on track!</p>
            </div>
          )}
          {budgetStatus.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              No budgets set. <a href="/budget" style={{ color: 'var(--color-primary)' }} className="underline">Set budgets →</a>
            </p>
          )}
        </div>

        {/* AI Suggestions */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            <Lightbulb size={14} style={{ color: '#F59E0B' }} />
            AI Suggestions
          </h2>
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="text-3xl">🤖</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Add more expenses to get AI insights.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s, i) => {
                const style = SEVERITY_STYLES[s.severity] ?? SEVERITY_STYLES.low;
                return (
                  <li
                    key={i}
                    className="rounded-input border p-3 text-xs"
                    style={{ background: style.bg, borderColor: style.border }}
                  >
                    <p className="font-semibold mb-0.5" style={{ color: style.text }}>
                      {s.category}
                    </p>
                    <p style={{ color: 'var(--text-primary)' }}>{s.message}</p>
                    {s.potential_savings > 0 && (
                      <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                        Potential saving: ₹{s.potential_savings.toLocaleString()}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
