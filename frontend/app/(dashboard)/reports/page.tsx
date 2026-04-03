'use client';

/**
 * @file app/(dashboard)/reports/page.tsx
 * @description Monthly reports page for FinTrack.
 *   Shows last 3 months of pre-generated expense reports.
 *   Layout per card:
 *     - Month name + year heading
 *     - Total spent (large, animated)
 *     - Top category badge
 *     - Overbudget categories (red badges)
 *     - Transactions count + Savings rate
 *     - "View Details" expand toggle → category breakdown table
 *   Actions:
 *     - "Generate Report" for current month (with confirmation dialog)
 *     - "Export PDF" placeholder (BONUS)
 * Connected to: GET /api/reports, POST /api/reports/generate
 * Owner: Frontend Developer
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, RefreshCw, FileText,
  TrendingDown, Award, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { format, parseISO }       from 'date-fns';
import { toast }                   from 'sonner';
import api                         from '@/lib/api';
import { cn, formatCurrency }     from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReportData {
  id:                   number;
  userId:               string;
  month:                string;
  totalSpent:           number;
  totalTransactions:    number;
  topCategory:          string | null;
  topPaymentMethod:     string | null;
  overbudgetCategories: string[];
  categoryBreakdown:    Record<string, number>;
  savingsRate:          number;
  createdAt:            string;
}

// ─── Category colour map ──────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Food:          '#F97316',
  Rent:          '#EF4444',
  Shopping:      '#EC4899',
  Travel:        '#3B82F6',
  Entertainment: '#8B5CF6',
  Health:        '#10B981',
  Education:     '#06B6D4',
  Utilities:     '#F59E0B',
  Other:         '#6B7280',
};

// ─── Sub-component: Single Report Card ────────────────────────────────────────

function ReportCard({ report }: { report: ReportData }) {
  const [expanded, setExpanded] = useState(false);

  const monthDisplay = format(parseISO(report.month + '-01'), 'MMMM yyyy');

  const breakdown = Object.entries(report.categoryBreakdown)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="card overflow-hidden animate-fade-in-up">
      {/* ── Card Header ──────────────────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {monthDisplay}
            </p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(report.totalSpent)}
            </p>
          </div>

          {/* Top Category badge */}
          {report.topCategory && (
            <span
              className="rounded-badge px-3 py-1 text-xs font-semibold"
              style={{
                background: `${CATEGORY_COLORS[report.topCategory] ?? '#6B7280'}20`,
                color:       CATEGORY_COLORS[report.topCategory] ?? '#94A3B8',
              }}
            >
              🏆 {report.topCategory}
            </span>
          )}
        </div>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <FileText size={12} />
            {report.totalTransactions} transactions
          </div>
          {report.topPaymentMethod && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              💳 Most used: <span style={{ color: 'var(--text-primary)' }}>{report.topPaymentMethod}</span>
            </div>
          )}
          {report.savingsRate > 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#10B981' }}>
              <CheckCircle size={12} />
              {report.savingsRate}% saved vs budget
            </div>
          )}
        </div>

        {/* ── Overbudget badges ───────────────────────────────────── */}
        {report.overbudgetCategories.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2 text-xs font-semibold" style={{ color: '#EF4444' }}>
              <AlertTriangle size={11} /> Overbudget:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.overbudgetCategories.map(cat => (
                <span
                  key={cat}
                  className="rounded-badge px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Expand toggle ───────────────────────────────────────── */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center justify-between rounded-input border px-3 py-2 text-xs font-medium transition-all duration-150 hover:bg-white/5"
          style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
        >
          View Category Breakdown
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* ── Expanded: category breakdown table ──────────────────── */}
      {expanded && (
        <div
          className="border-t px-5 pb-5 animate-fade-in-up"
          style={{ borderColor: 'var(--border-glow)' }}
        >
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-solid)' }}>
                <th className="pb-2 text-left text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Category</th>
                <th className="pb-2 text-right text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</th>
                <th className="pb-2 text-right text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(([cat, amount]) => {
                const pct = report.totalSpent > 0
                  ? Math.round((amount / report.totalSpent) * 100)
                  : 0;
                return (
                  <tr key={cat} className="border-b" style={{ borderColor: 'var(--border-solid)' }}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ background: CATEGORY_COLORS[cat] ?? '#6B7280' }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>{cat}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-semibold" style={{ color: '#10B981' }}>
                      {formatCurrency(amount)}
                    </td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-muted)' }}>
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports,  setReports]  = useState<ReportData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [genOpen,  setGenOpen]  = useState(false);
  const [genMonth, setGenMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [genLoading, setGenLoading] = useState(false);

  /* ── Fetch last 3 months ──────────────────────────────────── */
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/reports?months=3');
      setReports(res.data.data.reports);
    } catch {
      toast.error('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  /* ── Generate report ──────────────────────────────────────── */
  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const res = await api.post('/api/reports/generate', { monthYear: genMonth });
      if (res.data.success) {
        toast.success(`Report for ${genMonth} generated!`);
        setGenOpen(false);
        fetchReports();
      }
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Monthly Reports
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Pre-aggregated monthly summaries stored in SQLite
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export PDF — BONUS placeholder */}
          <button
            id="export-pdf-btn"
            onClick={() => toast.info('PDF export coming soon!')}
            className="flex items-center gap-2 rounded-input border px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/5"
            style={{ borderColor: 'var(--border-glow)', color: 'var(--text-muted)' }}
          >
            <FileText size={14} /> Export PDF
          </button>

          {/* Generate Report */}
          <button
            id="generate-report-btn"
            onClick={() => setGenOpen(true)}
            className="gradient-primary flex items-center gap-2 rounded-input px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.02]"
          >
            <RefreshCw size={14} /> Generate Report
          </button>
        </div>
      </div>

      {/* ── Report Cards Grid ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-4">
              <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-8 w-36 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-2 rounded"      style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-2 w-1/2 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        /* ── Empty State ───────────────────────────────────── */
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">📊</span>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            No reports yet
          </h2>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
            Reports are auto-generated on the 1st of each month. Click "Generate Report" to create one manually.
          </p>
          <button
            onClick={() => setGenOpen(true)}
            className="mt-2 gradient-primary rounded-input px-5 py-2 text-sm font-semibold text-white"
          >
            Generate First Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      )}

      {/* ── Generate Report Dialog ────────────────────────────── */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card p-6 w-full max-w-sm mx-4 animate-fade-in-up" role="dialog" aria-modal>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Generate Monthly Report
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              This will read all your expenses and budgets for the selected month
              and save a summary to the database.
            </p>

            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Month
              </label>
              <input
                id="report-month-input"
                type="month"
                value={genMonth}
                onChange={e => setGenMonth(e.target.value)}
                className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setGenOpen(false)}
                className="flex-1 rounded-input border px-4 py-2 text-sm transition-all hover:bg-white/5"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                id="confirm-generate-btn"
                onClick={handleGenerate}
                disabled={genLoading}
                className="flex-1 gradient-primary flex items-center justify-center gap-2 rounded-input px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
              >
                {genLoading ? <><span className="spinner" /> Generating…</> : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
