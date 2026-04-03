'use client';

/**
 * @file components/budget/BudgetAlertBanner.tsx
 * @description Persistent alert banner displayed on the dashboard when any
 *   budget is at 'warning' (≥80%) or 'exceeded' (≥100%) status.
 *   - Amber background for warning, red for exceeded
 *   - Lists affected categories with percentages
 *   - Dismissible via X button — dismissed state persists in sessionStorage
 *     (resets each browser session, so user sees it again tomorrow)
 * Connected to: dashboard/page.tsx, useBudget.ts
 * Owner: Frontend Developer
 *
 * Props:
 *   statuses — array of BudgetStatus objects (only warning/exceeded shown)
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, X, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BudgetStatus } from '@/hooks/useBudget';

interface BudgetAlertBannerProps {
  statuses: BudgetStatus[];
}

const DISMISS_KEY = 'fintrack_budgetalert_dismissed';

export default function BudgetAlertBanner({ statuses }: BudgetAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  /* ── On mount: check if banner was already dismissed this session ── */
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  /* ── Filter to only warning/exceeded statuses ─────────────────────── */
  const alertItems = statuses.filter(s => s.status !== 'safe');
  const hasExceeded = alertItems.some(s => s.status === 'exceeded');

  /* ── Don't render if no alerts or already dismissed ─────────────────── */
  if (dismissed || alertItems.length === 0) return null;

  /* ── Dismiss handler: writes to sessionStorage ────────────────────── */
  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div
      id="budget-alert-banner"
      role="alert"
      aria-live="polite"
      className={cn(
        'relative flex flex-col gap-2 rounded-card border p-4 mb-6 animate-fade-in-up',
        hasExceeded
          ? 'border-red-500/30    bg-red-500/10'
          : 'border-amber-500/30  bg-amber-500/10',
      )}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={16}
            className={hasExceeded ? 'text-red-400' : 'text-amber-400'}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: hasExceeded ? '#F87171' : '#FCD34D' }}
          >
            {hasExceeded
              ? '🚨 Budget Exceeded!'
              : '⚠️ Budget Warning'}
          </h3>
        </div>

        {/* Dismiss button */}
        <button
          id="budget-alert-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss budget alert"
          className="flex h-6 w-6 items-center justify-center rounded transition-colors duration-150 hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Alert Items List ─────────────────────────────────────── */}
      <ul className="space-y-1 pl-6">
        {alertItems.map(item => (
          <li
            key={item.category}
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-primary)' }}
          >
            {/* Status indicator dot */}
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full flex-shrink-0',
                item.status === 'exceeded' ? 'bg-red-400' : 'bg-amber-400',
              )}
            />
            <span className="font-medium">{item.category}:</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {item.percentageUsed}% used
              {item.status === 'exceeded'
                ? ` — over by ₹${Math.abs(item.remaining).toLocaleString()}`
                : ` — ₹${item.remaining.toLocaleString()} remaining`}
            </span>

            {/* Exceeded badge */}
            {item.status === 'exceeded' && (
              <span className="badge badge-danger text-[10px] py-0">Exceeded</span>
            )}
          </li>
        ))}
      </ul>

      {/* ── CTA hint ────────────────────────────────────────────── */}
      <p className="flex items-center gap-1.5 pl-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <TrendingDown size={12} />
        Go to <a href="/budget" className="underline hover:no-underline" style={{ color: 'var(--color-primary)' }}>
          Budget page
        </a> to adjust your limits.
      </p>
    </div>
  );
}
