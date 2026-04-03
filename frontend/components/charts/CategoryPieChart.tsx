'use client';

/**
 * @file components/charts/CategoryPieChart.tsx
 * @description Recharts PieChart showing spending breakdown by category.
 *   - Custom tooltip: category name, ₹ amount, percentage
 *   - Custom legend below the chart
 *   - Clicking a slice calls onSliceClick (filters expenses table)
 *   - Responsive via ResponsiveContainer
 *   - Animated on mount (Recharts built-in animation)
 * Connected to: dashboard/page.tsx
 * Owner: Frontend Developer
 *
 * Props:
 *   data         — [{ category, total, percentage, color }]
 *   onSliceClick — called with category string when a slice is clicked
 *   currency     — currency code for formatting
 */

import {
  PieChart, Pie, Cell, Tooltip, Legend,
  ResponsiveContainer, Sector,
} from 'recharts';
import { useState }          from 'react';
import { formatCurrency }    from '@/lib/utils';
import type { CurrencyCode } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryData {
  category:   string;
  total:      number;
  percentage: number;
  color:      string;
}

interface CategoryPieChartProps {
  data:          CategoryData[];
  onSliceClick?: (category: string) => void;
  currency?:     CurrencyCode;
  isLoading?:    boolean;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategoryData }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-card border px-4 py-3 shadow-glow text-sm"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-glow)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.category}</span>
      </div>
      <p style={{ color: 'var(--text-muted)' }}>
        Amount: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(d.total)}
        </span>
      </p>
      <p style={{ color: 'var(--text-muted)' }}>
        Share: <span className="font-bold" style={{ color: d.color }}>{d.percentage}%</span>
      </p>
    </div>
  );
}

// ─── Active Shape (expands on hover) ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx} cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}   // Expands 8px on hover
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryPieChart({
  data, onSliceClick, currency = 'INR', isLoading = false,
}: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

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
        <p className="text-4xl">📊</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data this month</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={60}      // Donut hole
          outerRadius={100}
          paddingAngle={2}
          activeIndex={activeIndex}
          activeShape={<ActiveShape />}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(-1)}
          onClick={(entry) => { if (onSliceClick) onSliceClick(entry.category); }}
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, i) => (
            <Cell
              key={`cell-${i}`}
              fill={entry.color}
              stroke="transparent"
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
            />
          ))}
        </Pie>

        <Tooltip content={<CustomTooltip />} />

        {/* Custom legend as coloured dots */}
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
