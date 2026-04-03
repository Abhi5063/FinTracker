'use client';

/**
 * @file app/(dashboard)/expenses/page.tsx
 * @description Full expense management page.
 *   - Heading + "+ Add Expense" button (keyboard shortcut 'N')
 *   - Filter bar: Category, Payment Method, Date range, debounced Search
 *   - Expense table with Date | Category badge | Amount | Payment | Notes | Actions
 *   - Delete confirm dialog
 *   - Pagination (prev/next)
 *   - CSV export button
 *   - Empty state with illustration
 *   - Loading skeleton rows
 * Connected to: useExpenses.ts, AddExpenseModal.tsx
 * Owner: Frontend Developer
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Download, Pencil, Trash2,
  ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react';
import { format, parseISO }                from 'date-fns';
import { toast }                           from 'sonner';
import { useExpenses, Expense, ExpenseCategory, PaymentMethod } from '@/hooks/useExpenses';
import { cn, formatCurrency }             from '@/lib/utils';

// ─── Category badge colours ───────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  Food:          { bg: 'rgba(249,115,22,0.12)', text: '#FB923C'  },
  Rent:          { bg: 'rgba(239,68,68,0.12)',  text: '#F87171'  },
  Shopping:      { bg: 'rgba(168,85,247,0.12)', text: '#C084FC'  },
  Travel:        { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA'  },
  Entertainment: { bg: 'rgba(236,72,153,0.12)', text: '#F472B6'  },
  Health:        { bg: 'rgba(16,185,129,0.12)', text: '#34D399'  },
  Education:     { bg: 'rgba(6,182,212,0.12)',  text: '#22D3EE'  },
  Utilities:     { bg: 'rgba(99,102,241,0.12)', text: '#818CF8'  },
  Other:         { bg: 'rgba(148,163,184,0.12)',text: '#94A3B8'  },
};

const CATEGORIES: ExpenseCategory[] = [
  'Food','Rent','Shopping','Travel','Entertainment','Health','Education','Utilities','Other',
];

const PAY_METHODS: PaymentMethod[] = [
  'UPI','Credit Card','Debit Card','Cash','Net Banking','Other',
];

export default function ExpensesPage() {
  const {
    expenses, pagination, isLoading, filters,
    setFilters, deleteExpense, exportCSV,
  } = useExpenses();

  /* ── Local UI state ─────────────────────────────────────────── */
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [searchInput,  setSearchInput]  = useState('');

  /* ── Debounced search: update filter 300ms after last keystroke ─ */
  useEffect(() => {
    const timer = setTimeout(() => setFilters({ search: searchInput }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilters]);

  /* ── Delete confirm handler ─────────────────────────────────── */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteExpense(deleteTarget._id);
    if (ok) setDeleteTarget(null);
  }, [deleteTarget, deleteExpense]);

  /* ── Open edit modal ────────────────────────────────────────── */
  const handleEdit = (expense: Expense) => {
    window.dispatchEvent(new CustomEvent('fintrack:open-add-expense', { detail: { expense } }));
  };

  return (
    <div className="space-y-5">

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {pagination?.total ?? 0} total expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <button
            id="export-csv-btn"
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-input border px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/5"
            style={{ borderColor: 'var(--border-glow)', color: 'var(--text-muted)' }}
          >
            <Download size={14} /> Export CSV
          </button>

          {/* Add Expense */}
          <button
            id="add-expense-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('fintrack:open-add-expense'))}
            className="gradient-primary flex items-center gap-2 rounded-input px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.02]"
          >
            <Plus size={15} /> Add Expense
            <kbd className="kbd ml-1">N</kbd>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            id="expense-search"
            type="text"
            placeholder="Search notes..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full rounded-input py-2 pl-8 pr-3 text-sm border transition-all duration-200 focus:outline-none"
            style={{
              background:  'var(--bg-tertiary)',
              borderColor: 'var(--border-solid)',
              color:       'var(--text-primary)',
            }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          id="filter-category"
          value={filters.category ?? ''}
          onChange={e => setFilters({ category: e.target.value as ExpenseCategory | '' })}
          className="rounded-input border px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Payment method filter */}
        <select
          id="filter-payment"
          value={filters.paymentMethod ?? ''}
          onChange={e => setFilters({ paymentMethod: e.target.value as PaymentMethod | '' })}
          className="rounded-input border px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
        >
          <option value="">All Methods</option>
          {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Date range */}
        <input
          type="date"
          id="filter-start-date"
          value={filters.startDate ?? ''}
          onChange={e => setFilters({ startDate: e.target.value })}
          className="rounded-input border px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
          aria-label="Start date filter"
        />
        <input
          type="date"
          id="filter-end-date"
          value={filters.endDate ?? ''}
          onChange={e => setFilters({ endDate: e.target.value })}
          className="rounded-input border px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
          aria-label="End date filter"
        />
      </div>

      {/* ── Expenses Table ──────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-glow)' }}>
                {['Date','Category','Amount','Payment','Notes','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* ── Loading Skeleton ──────────────────────────── */}
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b" style={{ borderColor: 'var(--border-solid)' }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse" style={{
                        background: 'var(--bg-tertiary)',
                        width: j === 5 ? '60px' : j === 2 ? '80px' : '100%',
                      }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* ── Expense Rows ──────────────────────────────── */}
              {!isLoading && expenses.map(expense => {
                const cat = CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.Other;
                return (
                  <tr
                    key={expense._id}
                    className="border-b transition-colors duration-150 hover:bg-white/[0.02]"
                    style={{ borderColor: 'var(--border-solid)' }}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(expense.date), 'dd MMM yyyy')}
                      {expense.isRecurring && (
                        <span className="ml-2 badge badge-primary text-[9px] py-0">↻ Recurring</span>
                      )}
                    </td>

                    {/* Category badge */}
                    <td className="px-4 py-3">
                      <span
                        className="rounded-badge px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: cat.bg, color: cat.text }}
                      >
                        {expense.category}
                      </span>
                    </td>

                    {/* Amount — bold green */}
                    <td className="px-4 py-3 whitespace-nowrap font-bold" style={{ color: '#10B981' }}>
                      {formatCurrency(expense.amount)}
                    </td>

                    {/* Payment Method */}
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {expense.paymentMethod}
                    </td>

                    {/* Notes — truncated */}
                    <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: 'var(--text-muted)' }} title={expense.notes}>
                      {expense.notes || '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          aria-label="Edit expense"
                          className="flex h-7 w-7 items-center justify-center rounded transition-colors duration-150 hover:bg-indigo-500/20"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(expense)}
                          aria-label="Delete expense"
                          className="flex h-7 w-7 items-center justify-center rounded transition-colors duration-150 hover:bg-red-500/20"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* ── Empty State ───────────────────────────────── */}
              {!isLoading && expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-5xl">💸</span>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        No expenses found.
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Add your first one with the button above or press{' '}
                        <kbd className="kbd">N</kbd>.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-glow)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </p>
            <div className="flex items-center gap-2">
              <button
                id="prev-page-btn"
                disabled={!pagination.hasPrev}
                onClick={() => setFilters({ page: filters.page - 1 })}
                className="flex items-center gap-1 rounded-input px-3 py-1.5 text-xs border transition-all duration-150 disabled:opacity-40"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <button
                id="next-page-btn"
                disabled={!pagination.hasNext}
                onClick={() => setFilters({ page: filters.page + 1 })}
                className="flex items-center gap-1 rounded-input px-3 py-1.5 text-xs border transition-all duration-150 disabled:opacity-40"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ── Delete Confirm Dialog ────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card p-6 w-full max-w-sm mx-4 animate-fade-in-up" role="dialog" aria-modal>
            <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
              Delete Expense?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              "{deleteTarget.category}" — {formatCurrency(deleteTarget.amount)} on{' '}
              {format(parseISO(deleteTarget.date), 'dd MMM yyyy')}. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-input border px-4 py-2 text-sm transition-colors duration-150 hover:bg-white/5"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={handleDeleteConfirm}
                className="gradient-danger rounded-input px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
