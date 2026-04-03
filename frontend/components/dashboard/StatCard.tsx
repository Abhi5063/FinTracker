'use client';

/**
 * @file components/dashboard/StatCard.tsx
 * @description Animated dashboard metric card.
 *   - Counts up from 0 → value over 1.5 seconds using requestAnimationFrame
 *     with easeOutQuart easing for a premium feel
 *   - Displays: title, animated value, subtitle, icon, trend badge
 *   - Trend badge: green ↑ for increase, red ↓ for decrease
 *   - Subtle indigo glow border with hover intensification
 * Connected to: dashboard/page.tsx
 * Owner: Frontend Developer
 *
 * Props:
 *   title       — card heading (e.g. "Total Spent")
 *   value       — raw numeric value (animated)
 *   prefix      — displayed before the value (e.g. "₹")
 *   suffix      — displayed after the value (e.g. "%")
 *   subtitle    — secondary text below the value
 *   icon        — Lucide icon component
 *   iconColor   — hex/css colour for the icon background
 *   trend       — numeric trend percentage (e.g. 12 for "+12%")
 *   trendType   — 'up' | 'down' determines colour
 *   isLoading   — shows skeleton if true
 */

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown }    from 'lucide-react';
import { cn }                          from '@/lib/utils';

// ─── CountUp Hook ─────────────────────────────────────────────────────────────

/**
 * Animates an integer from 0 to `target` over `duration` milliseconds.
 * Uses easeOutQuart — fast start, smooth deceleration at the end.
 * @param target   — the final value
 * @param duration — animation duration in ms (default: 1500)
 */
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  const rafRef    = useRef<number | null>(null);
  const startRef  = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }

    // Cancel any in-progress animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed  = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart: 1 - (1 - t)^4
      const eased    = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title:      string;
  value:      number;
  prefix?:    string;
  suffix?:    string;
  subtitle?:  string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon:       React.ComponentType<{ size?: number; className?: string; style?: any }>;
  iconBg?:    string;  // CSS colour for icon background
  trend?:     number;  // Percentage change (positive = up)
  trendType?: 'up' | 'down';
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatCard({
  title, value, prefix = '', suffix = '', subtitle,
  icon: Icon, iconBg = 'rgba(99,102,241,0.15)',
  trend, trendType = 'up', isLoading = false,
}: StatCardProps) {
  const animatedValue = useCountUp(isLoading ? 0 : value);

  /* ── Loading skeleton ─────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-3 w-24 rounded mb-3" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-8 w-32 rounded mb-2" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-3 w-20 rounded"     style={{ background: 'var(--bg-tertiary)' }} />
      </div>
    );
  }

  const isTrendPositive = trendType === 'up';

  return (
    <div className="card p-5 hover:animate-pulse-glow transition-all duration-300 group">
      {/* ── Top Row: Title + Icon ──────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>

        {/* Icon in a coloured circle, top-right */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-card transition-transform duration-200 group-hover:scale-110"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>

      {/* ── Animated Value ────────────────────────────────────── */}
      <div className="mb-1">
        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {prefix}
          {animatedValue.toLocaleString()}
          {suffix}
        </span>
      </div>

      {/* ── Subtitle + Trend Badge ────────────────────────────── */}
      <div className="flex items-center justify-between mt-2">
        {subtitle && (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}

        {/* Trend badge — only shown if trend is provided */}
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-semibold ml-auto',
              isTrendPositive ? 'badge-danger' : 'badge-success',
            )}
          >
            {isTrendPositive
              ? <TrendingUp  size={10} />
              : <TrendingDown size={10} />
            }
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}
