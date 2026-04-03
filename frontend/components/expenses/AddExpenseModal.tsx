'use client';

/**
 * @file components/expenses/AddExpenseModal.tsx
 * @description Modal for adding or editing an expense.
 *   - Desktop: slides in from the right edge (drawer style)
 *   - Mobile: slides up from the bottom (bottom sheet)
 *   - Fields: Amount, Category (icon grid), Date, Payment Method (tabs), Notes
 *   - BONUS: "Mark as Recurring" toggle + day-of-month selector
 *   - Form validation with inline errors per field
 *   - Calls POST or PUT depending on edit mode
 * Connected to: useExpenses.ts, expenses/page.tsx
 * Owner: Frontend Developer
 *
 * Props:
 *   isOpen        — controls modal visibility
 *   onClose       — called to close the modal
 *   expenseToEdit — optional Expense to populate form for edit mode
 */

import { useState, useEffect } from 'react';
import { X, IndianRupee, CalendarDays, RefreshCw } from 'lucide-react';
import { format }           from 'date-fns';
import { useExpenses }      from '@/hooks/useExpenses';
import { cn }               from '@/lib/utils';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/hooks/useExpenses';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { name: ExpenseCategory; icon: string }[] = [
  { name: 'Food',          icon: '🍕' },
  { name: 'Rent',          icon: '🏠' },
  { name: 'Shopping',      icon: '🛍️' },
  { name: 'Travel',        icon: '✈️' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Health',        icon: '💊' },
  { name: 'Education',     icon: '📚' },
  { name: 'Utilities',     icon: '⚡' },
  { name: 'Other',         icon: '📦' },
];

const PAY_METHODS: { name: PaymentMethod; icon: string }[] = [
  { name: 'UPI',         icon: '📱' },
  { name: 'Credit Card', icon: '💳' },
  { name: 'Debit Card',  icon: '🏧' },
  { name: 'Cash',        icon: '💵' },
  { name: 'Net Banking', icon: '🌐' },
  { name: 'Other',       icon: '🔄' },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AddExpenseModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  expenseToEdit?: Expense | null;
}

// ─── Form State ────────────────────────────────────────────────────────────────

interface FormState {
  amount:        string;
  category:      ExpenseCategory;
  date:          string;
  paymentMethod: PaymentMethod;
  notes:         string;
  isRecurring:   boolean;
  recurringDay:  string;
}

const DEFAULT_FORM: FormState = {
  amount:        '',
  category:      'Food',
  date:          format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: 'UPI',
  notes:         '',
  isRecurring:   false,
  recurringDay:  '1',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddExpenseModal({ isOpen, onClose, expenseToEdit }: AddExpenseModalProps) {
  const { createExpense, updateExpense } = useExpenses();

  const [form,    setForm]    = useState<FormState>(DEFAULT_FORM);
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);

  const isEditMode = Boolean(expenseToEdit);

  /* ── Populate form in edit mode ─────────────────────────────── */
  useEffect(() => {
    if (expenseToEdit) {
      setForm({
        amount:        String(expenseToEdit.amount),
        category:      expenseToEdit.category,
        date:          expenseToEdit.date.slice(0, 10),
        paymentMethod: expenseToEdit.paymentMethod,
        notes:         expenseToEdit.notes ?? '',
        isRecurring:   expenseToEdit.isRecurring,
        recurringDay:  String(expenseToEdit.recurringDay ?? 1),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
  }, [expenseToEdit, isOpen]);

  /* ── Close on Escape key ─────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* ── Field update helper ─────────────────────────────────────── */
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const next = { ...e }; delete next[key]; return next; });
  };

  /* ── Validation ──────────────────────────────────────────────── */
  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'Enter a valid amount > 0.';
    }
    if (!form.date) errs.date = 'Date is required.';
    if (form.isRecurring) {
      const day = parseInt(form.recurringDay, 10);
      if (!day || day < 1 || day > 28) errs.recurringDay = 'Recurring day must be 1–28.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      amount:        parseFloat(form.amount),
      category:      form.category,
      date:          form.date,
      paymentMethod: form.paymentMethod,
      notes:         form.notes || undefined,
      isRecurring:   form.isRecurring,
      recurringDay:  form.isRecurring ? parseInt(form.recurringDay, 10) : undefined,
    };

    setLoading(true);
    const ok = isEditMode && expenseToEdit
      ? await updateExpense(expenseToEdit._id, payload)
      : await createExpense(payload);
    setLoading(false);

    if (ok) onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* ── Drawer Panel ─────────────────────────────────────── */}
      <div
        id="add-expense-modal"
        role="dialog"
        aria-modal
        aria-label={isEditMode ? 'Edit Expense' : 'Add Expense'}
        className={cn(
          'fixed z-50 flex flex-col shadow-glow',
          'animate-slide-in-left',
          // Desktop: right-side drawer
          'right-0 top-0 bottom-0 w-full max-w-md',
          // Mobile: full-width bottom sheet
          'sm:top-0 sm:bottom-0',
        )}
        style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-glow)' }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-glow)' }}
        >
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {isEditMode ? '✏️ Edit Expense' : '➕ Add Expense'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Form body (scrollable) ────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Amount
            </label>
            <div className="flex items-center gap-2 rounded-input border transition-all duration-200"
                 style={{ background: 'var(--bg-tertiary)', borderColor: errors.amount ? 'var(--color-danger)' : 'var(--border-solid)' }}>
              <span className="pl-3" style={{ color: 'var(--text-muted)' }}>₹</span>
              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>
            {errors.amount && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.amount}</p>}
          </div>

          {/* Category Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => update('category', c.name)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-input border px-2 py-2.5 text-xs font-medium transition-all duration-150',
                    form.category === c.name
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'hover:bg-white/5',
                  )}
                  style={form.category !== c.name
                    ? { borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }
                    : {}}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: 'var(--bg-tertiary)', borderColor: errors.date ? 'var(--color-danger)' : 'var(--border-solid)', color: 'var(--text-primary)' }}
            />
            {errors.date && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.date}</p>}
          </div>

          {/* Payment Method Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Payment Method
            </label>
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map(m => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => update('paymentMethod', m.name)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                    form.paymentMethod === m.name
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'hover:bg-white/5',
                  )}
                  style={form.paymentMethod !== m.name
                    ? { borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }
                    : {}}
                >
                  {m.icon} {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Notes <span className="lowercase font-normal">(optional)</span>
            </label>
            <textarea
              id="expense-notes"
              rows={3}
              placeholder="Add a note about this expense..."
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              maxLength={500}
              className="w-full rounded-input border px-3 py-2.5 text-sm resize-none focus:outline-none"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
            />
            <p className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>{form.notes.length}/500</p>
          </div>

          {/* BONUS: Recurring Toggle */}
          <div
            className="rounded-input border p-4 space-y-3"
            style={{ borderColor: 'var(--border-solid)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} style={{ color: form.isRecurring ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Mark as Recurring
                </span>
                <span className="badge badge-primary text-[9px] py-0">Monthly</span>
              </div>

              {/* Toggle switch */}
              <button
                id="recurring-toggle"
                type="button"
                role="switch"
                aria-checked={form.isRecurring}
                onClick={() => update('isRecurring', !form.isRecurring)}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors duration-200',
                  form.isRecurring ? 'bg-indigo-500' : 'bg-slate-600',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                    form.isRecurring ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            {/* Day of month selector — only when isRecurring */}
            {form.isRecurring && (
              <div className="animate-fade-in-up space-y-1">
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Repeats on day of month:
                </label>
                <input
                  id="recurring-day"
                  type="number"
                  min="1"
                  max="28"
                  value={form.recurringDay}
                  onChange={e => update('recurringDay', e.target.value)}
                  className="w-24 rounded-input border px-3 py-1.5 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: errors.recurringDay ? 'var(--color-danger)' : 'var(--border-solid)', color: 'var(--text-primary)' }}
                />
                {errors.recurringDay && (
                  <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.recurringDay}</p>
                )}
              </div>
            )}
          </div>
        </form>

        {/* ── Footer Actions ──────────────────────────────────── */}
        <div
          className="flex gap-3 px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border-glow)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-input border px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-white/5"
            style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            id="save-expense-btn"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 gradient-primary flex items-center justify-center gap-2 rounded-input px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? <><span className="spinner" /> Saving…</> : isEditMode ? 'Save Changes' : 'Save Expense'}
          </button>
        </div>
      </div>
    </>
  );
}
