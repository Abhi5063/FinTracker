'use client';

/**
 * @file app/(dashboard)/budget/page.tsx
 * @description Monthly budget management page.
 *   - Heading with current month+year
 *   - Total overview card: total set vs total spent
 *   - 3-column grid of BudgetCard components
 *   - "+ Set Budget" button for unconfigured categories
 *   - Clicking a BudgetCard opens edit modal
 * Connected to: useBudget.ts, BudgetCard.tsx
 * Owner: Frontend Developer
 */

import { useState }                             from 'react';
import { Plus, TrendingDown }                   from 'lucide-react';
import { format }                               from 'date-fns';
import { useBudget }                            from '@/hooks/useBudget';
import BudgetCard                               from '@/components/budget/BudgetCard';
import { formatCurrency }                       from '@/lib/utils';
import type { ExpenseCategory }                 from '@/hooks/useExpenses';

const ALL_CATEGORIES: ExpenseCategory[] = [
  'Food','Rent','Shopping','Travel','Entertainment','Health','Education','Utilities','Other',
];

export default function BudgetPage() {
  const { budgetStatus, budgets, isLoading, monthYear, setBudget } = useBudget();

  /* ── Modal state ─────────────────────────────────────────── */
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editCategory,  setEditCategory]  = useState<ExpenseCategory | null>(null);
  const [limitInput,    setLimitInput]    = useState('');
  const [saving,        setSaving]        = useState(false);

  /* ── Open edit modal pre-filled with existing limit ──────── */
  const handleEditCard = (category: ExpenseCategory) => {
    setEditCategory(category);
    const existing = budgets.find(b => b.category === category);
    setLimitInput(existing ? String(existing.limitAmount) : '');
    setModalOpen(true);
  };

  /* ── Open "set new budget" modal ─────────────────────────── */
  const handleNewBudget = (category?: ExpenseCategory) => {
    setEditCategory(category ?? null);
    setLimitInput('');
    setModalOpen(true);
  };

  /* ── Save budget ─────────────────────────────────────────── */
  const handleSave = async () => {
    if (!editCategory || !limitInput || isNaN(Number(limitInput))) return;
    setSaving(true);
    await setBudget({ category: editCategory, limitAmount: parseFloat(limitInput) });
    setSaving(false);
    setModalOpen(false);
  };

  /* ── Stats ───────────────────────────────────────────────── */
  const totalBudget = budgetStatus.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent  = budgetStatus.reduce((s, b) => s + b.totalSpent,  0);

  /* ── Categories without any budget yet ───────────────────── */
  const configuredCategories = new Set(budgets.map(b => b.category));
  const unconfiguredCategories = ALL_CATEGORIES.filter(c => !configuredCategories.has(c));

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Monthly Budgets —{' '}
            <span style={{ color: 'var(--color-primary)' }}>
              {format(new Date(monthYear + '-01'), 'MMMM yyyy')}
            </span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {budgetStatus.length} categories configured
          </p>
        </div>
        <button
          id="set-budget-btn"
          onClick={() => handleNewBudget()}
          className="gradient-primary flex items-center gap-2 rounded-input px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.02]"
        >
          <Plus size={15} /> Set Budget
        </button>
      </div>

      {/* ── Total Overview Card ───────────────────────────────── */}
      {budgetStatus.length > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Total Budget
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Total Spent
              </p>
              <p className="text-2xl font-bold" style={{ color: totalSpent > totalBudget ? '#EF4444' : '#10B981' }}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Remaining
              </p>
              <p className="text-2xl font-bold" style={{ color: totalBudget - totalSpent >= 0 ? '#10B981' : '#EF4444' }}>
                {formatCurrency(Math.abs(totalBudget - totalSpent))}
                {totalBudget - totalSpent < 0 && <span className="text-xs ml-1 font-normal">over</span>}
              </p>
            </div>

            {/* Overall progress bar */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Overall Usage</span>
                <span className="font-semibold">
                  {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{
                    '--progress-value': `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                    width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                    background: totalSpent > totalBudget
                      ? 'linear-gradient(90deg,#EF4444,#F97316)'
                      : 'linear-gradient(90deg,#6366F1,#8B5CF6)',
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget Cards Grid ─────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-4 w-24 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-2 rounded"       style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-3 w-16 rounded"  style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgetStatus.map(bs => (
            <BudgetCard
              key={bs.category}
              {...bs}
              onEdit={() => handleEditCard(bs.category)}
            />
          ))}

          {/* Unconfigured category placeholders */}
          {unconfiguredCategories.map(cat => (
            <div
              key={cat}
              onClick={() => handleNewBudget(cat)}
              role="button"
              tabIndex={0}
              className="card cursor-pointer p-5 border-dashed transition-all duration-200 hover:border-indigo-500/50 hover:bg-white/[0.02]"
            >
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <TrendingDown size={20} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cat}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No budget set</p>
                <span className="badge badge-primary text-[10px]">+ Set limit</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Set/Edit Budget Modal ────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card p-6 w-full max-w-sm mx-4 animate-fade-in-up" role="dialog" aria-modal>
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editCategory ? `Set budget for ${editCategory}` : 'Set Budget'}
            </h3>

            {/* Category selector if not pre-selected */}
            {!editCategory && (
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  Category
                </label>
                <select
                  value={editCategory ?? ''}
                  onChange={e => setEditCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select category…</option>
                  {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Limit amount */}
            <div className="mb-6">
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Monthly Limit (₹)
              </label>
              <input
                id="budget-limit-input"
                type="number"
                min="1"
                step="100"
                placeholder="Enter limit amount..."
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                autoFocus
                className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-input border px-4 py-2 text-sm transition-all hover:bg-white/5"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                id="save-budget-btn"
                onClick={handleSave}
                disabled={saving || !editCategory || !limitInput}
                className="flex-1 gradient-primary flex items-center justify-center gap-2 rounded-input px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
              >
                {saving ? <><span className="spinner" /> Saving…</> : 'Save Budget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
