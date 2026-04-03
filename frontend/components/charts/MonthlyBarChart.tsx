'use client';

/**
 * @file components/charts/MonthlyBarChart.tsx
 * @description Recharts BarChart comparing monthly totals for the last 6 months.
 *   - Current month bar: indigo (#6366F1)
 *   - Past month bars: slate (#334155)
 *   - Rounded bar tops via custom shape
 *   - Custom tooltip with month + ₹ amount
 *   - Responsive via ResponsiveContainer
 * Connected to: dashboard/page.tsx
 * Owner: Frontend Developer
 *
 * Props:
 *   data — [{ month: "Apr 2024", monthKey: "2024-04", amount, isCurrent }]
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyData {
  month:     string;   // Display label e.g. "Apr 2024"
  monthKey:  string;   // "YYYY-MM"
  amount:    number;
  isCurrent: boolean;
}

interface MonthlyBarChartProps {
  data:       MonthlyData[];
  isLoading?: boolean;
}

/* ── Custom Tooltip ──────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { value: number; payload: MonthlyData }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div
      className="rounded-card border px-4 py-3 shadow-glow text-sm"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-glow)' }}
    >
      <p className="text-xs mb-1 font-semibold" style={{ color: d.payload.isCurrent ? '#818CF8' : 'var(--text-muted)' }}>
        {label} {d.payload.isCurrent && '(Current)'}
      </p>
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
        {formatCurrency(d.value)}
      </p>
    </div>
  );
}

/* ── Rounded Bar Shape ───────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RoundedBar(props: any) {
  const { x, y, width, height, fill } = props;
  const radius = 6;
  if (height <= 0) return null;
  return (
    <path
      d={`M${x},${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${y + height} H${x} Z`}
      fill={fill}
    />
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function MonthlyBarChart({ data, isLoading = false }: MonthlyBarChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center flex-col gap-2">
        <p className="text-4xl">📊</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No monthly data available</p>
      </div>
    );
  }

  const formatYAxis = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
    if (val >= 1000)   return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={32}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />

        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={55}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

        <Bar dataKey="amount" shape={<RoundedBar />} animationDuration={800}>
          {data.map((entry, index) => (
            <Cell
              key={`bar-${index}`}
              /* Current month = indigo, past months = slate */
              fill={entry.isCurrent ? '#6366F1' : '#334155'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
