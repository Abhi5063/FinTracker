'use client';

/**
 * @file app/(dashboard)/admin/page.tsx
 * @description Admin-only dashboard showing platform-wide stats.
 *   Access control: redirects non-admin users to /dashboard.
 *   Data source: GET /api/reports/admin/all
 *
 *   Layout:
 *   ROW 1: 3 platform stat cards (Total Users, Total Transactions, Total ₹ Tracked)
 *   ROW 2: Table of all users with userId, topCategory, totalSpent,
 *           totalTransactions, overbudget warnings, savingsRate
 * Connected to: GET /api/reports/admin/all, useAuth hook
 * Owner: Frontend Developer
 */

import { useEffect, useState }        from 'react';
import { useRouter }                  from 'next/navigation';
import { Users, Receipt, IndianRupee, ShieldAlert } from 'lucide-react';
import { format }                     from 'date-fns';
import { toast }                      from 'sonner';
import api                            from '@/lib/api';
import { useAuth }                    from '@/hooks/useAuth';
import { cn, formatCurrency }        from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminReport {
  id:                   number;
  userId:               string;
  month:                string;
  totalSpent:           number;
  totalTransactions:    number;
  topCategory:          string | null;
  topPaymentMethod:     string | null;
  overbudgetCategories: string[];
  savingsRate:          number;
}

interface PlatformStats {
  totalUsers:        number;
  totalTransactions: number;
  totalTracked:      number;
  monthYear:         string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function AdminStatCard({
  icon: Icon, title, value, subtitle, color,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card"
        style={{ background: color ? `${color}20` : 'rgba(99,102,241,0.15)' }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
        <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router            = useRouter();
  const { user, isLoaded } = useAuth();

  const [reports,        setReports]        = useState<AdminReport[]>([]);
  const [platformStats,  setPlatformStats]  = useState<PlatformStats | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [monthFilter,    setMonthFilter]    = useState(format(new Date(), 'yyyy-MM'));

  /* ── Role guard: redirect non-admins ─────────────────────── */
  useEffect(() => {
    if (isLoaded && user?.role !== 'admin') {
      toast.error('Access denied. Admins only.');
      router.replace('/dashboard');
    }
  }, [isLoaded, user, router]);

  /* ── Fetch admin data ────────────────────────────────────── */
  useEffect(() => {
    if (!isLoaded || user?.role !== 'admin') return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/reports/admin/all?monthYear=${monthFilter}`);
        if (res.data.success) {
          setReports(res.data.data.reports);
          setPlatformStats(res.data.data.platformStats);
        }
      } catch {
        toast.error('Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, user, monthFilter]);

  if (!isLoaded || user?.role !== 'admin') return null;

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={18} style={{ color: '#F59E0B' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Platform-wide analytics. Admin eyes only.
          </p>
        </div>

        {/* Month selector */}
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="rounded-input border px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
          aria-label="Filter month"
        />
      </div>

      {/* ── Platform Stat Cards ───────────────────────────────── */}
      {platformStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminStatCard
            icon={Users}
            title="Total Active Users"
            value={platformStats.totalUsers.toLocaleString()}
            subtitle={`In ${monthFilter}`}
            color="#6366F1"
          />
          <AdminStatCard
            icon={Receipt}
            title="Total Transactions"
            value={platformStats.totalTransactions.toLocaleString()}
            subtitle={`In ${monthFilter}`}
            color="#10B981"
          />
          <AdminStatCard
            icon={IndianRupee}
            title="Total ₹ Tracked"
            value={formatCurrency(platformStats.totalTracked)}
            subtitle={`In ${monthFilter}`}
            color="#F59E0B"
          />
        </div>
      )}

      {/* ── Users Table ──────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-glow)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            User Activity — {monthFilter}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-glow)' }}>
                {['User ID','Top Category','Total Spent','Transactions','Savings Rate','Alerts'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'var(--border-solid)' }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)', width: '80%' }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && reports.map(r => (
                <tr key={r.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'var(--border-solid)' }}>
                  {/* User ID — truncated */}
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {r.userId.slice(-8)}
                  </td>

                  {/* Top Category */}
                  <td className="px-4 py-3">
                    {r.topCategory
                      ? <span className="badge badge-primary">{r.topCategory}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>

                  {/* Total Spent */}
                  <td className="px-4 py-3 font-bold" style={{ color: '#10B981' }}>
                    {formatCurrency(r.totalSpent)}
                  </td>

                  {/* Transactions */}
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                    {r.totalTransactions}
                  </td>

                  {/* Savings Rate */}
                  <td className="px-4 py-3">
                    <span
                      className="font-semibold"
                      style={{ color: r.savingsRate > 0 ? '#34D399' : 'var(--text-muted)' }}
                    >
                      {r.savingsRate > 0 ? `${r.savingsRate}% saved` : '—'}
                    </span>
                  </td>

                  {/* Overbudget alerts */}
                  <td className="px-4 py-3">
                    {r.overbudgetCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.overbudgetCategories.slice(0, 2).map(cat => (
                          <span key={cat} className="badge badge-danger text-[10px] py-0">{cat}</span>
                        ))}
                        {r.overbudgetCategories.length > 2 && (
                          <span className="badge badge-danger text-[10px] py-0">+{r.overbudgetCategories.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#34D399' }}>✓ On track</span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No reports for {monthFilter}. Reports auto-generate on the 1st of each month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
