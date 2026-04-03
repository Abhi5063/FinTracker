'use client';

/**
 * @file components/charts/SpendingLineChart.tsx
 * @description Recharts LineChart for daily spending over the last 30 days.
 *   - Smooth monotone curve (type="monotone")
 *   - Gradient area fill below the line
 *   - Dots visible on hover only (activeDot)
 *   - X-axis: "MMM d" format (e.g. "Apr 1"), Y-axis: ₹ abbreviated
 *   - Custom tooltip with date + ₹ amount
 * Connected to: dashboard/page.tsx
 * Owner: Frontend Developer
 *
 * Props:
 *   data      — [{ date: "YYYY-MM-DD", amount: number }]
 *   currency  — currency code for Y-axis formatting
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area,
} from 'recharts';
import { format, parseISO }  from 'date-fns';
import { formatCurrency }    from '@/lib/utils';
import type { CurrencyCode } from '@/types';

interface DailySpending {
  date:   string;  // "YYYY-MM-DD"
  amount: number;
}

interface SpendingLineChartProps {
  data:       DailySpending[];
  currency?:  CurrencyCode;
  isLoading?: boolean;
}

/* ── Custom Tooltip ──────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { value: number }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-card border px-4 py-3 shadow-glow text-sm"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-glow)' }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        {label ? format(parseISO(label), 'dd MMM yyyy') : ''}
      </p>
      <p className="font-bold" style={{ color: '#6366F1' }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function SpendingLineChart({
  data, currency = 'INR', isLoading = false,
}: SpendingLineChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center flex-col gap-2">
        <p className="text-4xl">📈</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No spending data yet</p>
      </div>
    );
  }

  // Format X-axis tick: "Jan 1" → "Apr 15"
  const formatXAxis = (dateStr: string) => {
    try { return format(parseISO(dateStr), 'MMM d'); } catch { return dateStr; }
  };

  // Abbreviate Y-axis amounts
  const formatYAxis = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
    if (val >= 1000)   return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        {/* Gradient fill definition */}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}   />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />

        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />

        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={55}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1 }} />

        {/* Area fill for gradient effect */}
        <Area
          type="monotone"
          dataKey="amount"
          fill="url(#lineGradient)"
          stroke="transparent"
        />

        {/* Main smooth line */}
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#6366F1"
          strokeWidth={2.5}
          dot={false}                              // No dots on the line
          activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
