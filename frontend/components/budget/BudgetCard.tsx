'use client';

/**
 * @file components/budget/BudgetCard.tsx
 * @description A single category budget card with animated progress bar.
 *   - Shows category icon, name, spent/limit amounts
 *   - Animated progress bar: green (0–60%) → yellow (60–80%) → orange (80–100%) → red pulsing (>100%)
 *   - Warning icon renders when usage ≥ 80%
 *   - Red pulsing animation when exceeded
 *   - Clicking the card triggers the onEdit callback (opens edit modal)
 * Connected to: budget/page.tsx, useBudget.ts
 * Owner: Frontend Developer
 *
 * Props:
 *   category       — ExpenseCategory string
 *   limitAmount    — budget ceiling (number)
 *   totalSpent     — actual spend this month (number)
 *   percentageUsed — 0–100+ derived percentage
 *   status         — 'safe' | 'warning' | 'exceeded'
 *   onEdit         — clicked handler to open edit modal
 */

import { AlertTriangle, TrendingUp } from 'lucide-react';
import { cn, formatCurrency }       from '@/lib/utils';
import type { BudgetStatus }        from '@/hooks/useBudget';
import type { CurrencyCode }        from '@/types';

// ─── Category icon + colour map ────────────────────────────────────────────────
const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  Food:          { icon: '🍕', color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  Rent:          { icon: '🏠', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  Shopping:      { icon: '🛍️', color: '#A855F7', bg: 'rgba(168,85,247,0.12)'  },
  Travel:        { icon: '✈️', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  Entertainment: { icon: '🎬', color: '#EC4899', bg: 'rgba(236,72,153,0.12)'  },
  Health:        { icon: '💊', color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  Education:     { icon: '📚', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)'   },
  Utilities:     { icon: '⚡', color: '#6366F1', bg: 'rgba(99,102,241,0.12)'  },
  Other:         { icon: '📦', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

interface BudgetCardProps extends BudgetStatus {
  currency?: CurrencyCode;
  onEdit:    () => void;
}

export default function BudgetCard({
  category, limitAmount, totalSpent, percentageUsed, status, remaining,
  currency = 'INR', onEdit,
}: BudgetCardProps) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.Other;

  /* ── Progress bar colour based on usage ─────────────────────────── */
  const barClass =
    percentageUsed >= 100 ? 'danger' :
    percentageUsed >= 80  ? 'warning' :
    percentageUsed >= 60  ? 'warning' :
    'safe';

  // Custom inline gradient for more granular colour control
  const barGradient =
    percentageUsed >= 100 ? 'linear-gradient(90deg,#EF4444,#F97316)' :
    percentageUsed >= 80  ? 'linear-gradient(90deg,#F97316,#FBBF24)' :
    percentageUsed >= 60  ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' :
    'linear-gradient(90deg,#10B981,#34D399)';

  const cappedPct = Math.min(percentageUsed, 100);

  return (
    <div
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onEdit()}
      aria-label={`Edit ${category} budget`}
      className={cn(
        'card cursor-pointer p-5 transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-glow focus-visible:outline-none focus-visible:ring-2',
        // Pulsing red glow when exceeded
        percentageUsed >= 100 && 'animate-pulse-glow border-red-500/30',
      )}
    >
      {/* ── Card Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        {/* Category icon + name */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-card text-xl flex-shrink-0"
            style={{ background: meta.bg }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {category}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {percentageUsed}% used
            </p>
          </div>
        </div>

        {/* Warning / Exceeded badge */}
        {status !== 'safe' && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-badge px-2 py-1 text-xs font-semibold',
              status === 'exceeded'
                ? 'badge-danger'
                : 'badge-warning',
            )}
          >
            <AlertTriangle size={11} />
            {status === 'exceeded' ? 'Over!' : 'Near limit'}
          </div>
        )}
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────── */}
      <div className="progress-track mb-3">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={cappedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            '--progress-value': `${cappedPct}%`,
            background: barGradient,
            width: `${cappedPct}%`,
            animation: 'progressFill 0.85s cubic-bezier(0.4,0,0.2,1) forwards',
          } as React.CSSProperties}
        />
      </div>

      {/* ── Amount Details ────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-muted)' }}>
          Spent: <span className="font-semibold" style={{ color: meta.color }}>
            {formatCurrency(totalSpent, currency)}
          </span>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {remaining >= 0 ? 'Left:' : 'Over:'}{' '}
          <span
            className="font-semibold"
            style={{ color: remaining >= 0 ? '#10B981' : '#EF4444' }}
          >
            {formatCurrency(Math.abs(remaining), currency)}
          </span>
        </span>
      </div>

      {/* Limit display */}
      <div className="mt-1 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
        Limit: {formatCurrency(limitAmount, currency)}
      </div>
    </div>
  );
}
