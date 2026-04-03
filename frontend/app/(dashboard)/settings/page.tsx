'use client';

/**
 * @file app/(dashboard)/settings/page.tsx
 * @description User settings page with 5 sections:
 *   1. Profile        — Update name; avatar shows auto-generated initials
 *   2. Preferences    — Default currency, payment method, date format
 *   3. Notifications  — Toggle browser push notifications for budget alerts
 *   4. Data           — Export all expenses as CSV; Delete account button
 *   5. Danger Zone    — Delete all expenses for current month
 *                       (requires typing "DELETE" to confirm)
 * Connected to: useAuth.ts, PATCH /api/auth/me, GET /api/expenses/export
 * Owner: Frontend Developer
 */

import { useState, useEffect }       from 'react';
import {
  User, Sliders, Bell, Database, Trash2,
  ChevronDown, Download, Check, AlertTriangle,
} from 'lucide-react';
import { toast }                     from 'sonner';
import api                           from '@/lib/api';
import { useAuth }                   from '@/hooks/useAuth';
import { cn }                        from '@/lib/utils';

// ─── Preference constants ─────────────────────────────────────────────────────

const CURRENCIES  = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD'];
const PAY_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking', 'Other'];
const DATE_FORMATS = ['dd MMM yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd/MM/yyyy'];

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function SettingsSection({
  title, icon: Icon, children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b" style={{ borderColor: 'var(--border-glow)' }}>
        <div
          className="flex h-7 w-7 items-center justify-center rounded"
          style={{ background: 'rgba(99,102,241,0.15)' }}
        >
          <Icon size={14} />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ─── Labelled Input ───────────────────────────────────────────────────────────

function LabeledInput({
  label, id, type = 'text', value, onChange, placeholder, disabled,
}: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();

  /* ── Profile state ───────────────────────────────────────── */
  const [name,        setName]        = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  /* ── Preferences state ───────────────────────────────────── */
  const [currency,   setCurrency]   = useState('INR');
  const [payMethod,  setPayMethod]  = useState('UPI');
  const [dateFormat, setDateFormat] = useState('dd MMM yyyy');
  const [savingPrefs, setSavingPrefs] = useState(false);

  /* ── Notifications state ─────────────────────────────────── */
  const [notifEnabled, setNotifEnabled] = useState(false);

  /* ── Danger Zone state ───────────────────────────────────── */
  const [deleteInput,    setDeleteInput]    = useState('');
  const [deleteOpen,     setDeleteOpen]     = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [acctDeleteOpen, setAcctDeleteOpen] = useState(false);

  /* ── Load preferences from localStorage ─────────────────── */
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('fintrack_prefs') ?? '{}');
      if (prefs.currency)   setCurrency(prefs.currency);
      if (prefs.payMethod)  setPayMethod(prefs.payMethod);
      if (prefs.dateFormat) setDateFormat(prefs.dateFormat);
    } catch {}

    // Check notification permission
    if (typeof Notification !== 'undefined') {
      setNotifEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Auto-update name when user loads
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  /* ── Avatar initials ─────────────────────────────────────── */
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  /* ── Save profile ────────────────────────────────────────── */
  const saveProfile = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty.'); return; }
    setSavingProfile(true);
    try {
      await api.patch('/api/auth/me', { name: name.trim() });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Save preferences to localStorage ───────────────────── */
  const savePreferences = () => {
    localStorage.setItem('fintrack_prefs', JSON.stringify({ currency, payMethod, dateFormat }));
    setSavingPrefs(true);
    setTimeout(() => setSavingPrefs(false), 1500);
    toast.success('Preferences saved!');
  };

  /* ── Request notification permission ────────────────────── */
  const toggleNotifications = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notifications not supported in this browser.');
      return;
    }
    if (!notifEnabled) {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setNotifEnabled(true);
        toast.success('Budget alerts enabled!');
      } else {
        toast.error('Permission denied. Enable in browser settings.');
      }
    } else {
      // Can't programmatically revoke — guide user
      toast.info('To disable: click the lock icon in your browser address bar.');
    }
  };

  /* ── Export all expenses ─────────────────────────────────── */
  const handleExportAll = async () => {
    try {
      const res = await api.get('/api/expenses/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `fintrack_all_expenses.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch {
      toast.error('Export failed.');
    }
  };

  /* ── Delete this month's expenses ────────────────────────── */
  const handleDeleteMonthExpenses = async () => {
    if (deleteInput !== 'DELETE') {
      toast.error('Type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await api.delete('/api/expenses/bulk-delete-current-month');
      toast.success('This month\'s expenses deleted.');
      setDeleteOpen(false);
      setDeleteInput('');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Manage your profile, preferences, and account.
        </p>
      </div>

      {/* ══ SECTION 1: Profile ════════════════════════════════ */}
      <SettingsSection title="Profile" icon={User}>
        <div className="flex items-center gap-5 mb-5">
          {/* Avatar circle with initials */}
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
            aria-label={`Avatar: ${initials}`}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name || 'Your Name'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            <p className="text-xs mt-0.5 badge badge-primary">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <LabeledInput
            id="settings-name"
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Your full name"
          />
          <LabeledInput
            id="settings-email"
            label="Email"
            type="email"
            value={user?.email ?? ''}
            onChange={() => {}}
            disabled
          />
        </div>

        <button
          id="save-profile-btn"
          onClick={saveProfile}
          disabled={savingProfile}
          className="mt-4 gradient-primary rounded-input px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingProfile ? 'Saving…' : 'Save Profile'}
        </button>
      </SettingsSection>

      {/* ══ SECTION 2: Preferences ════════════════════════════ */}
      <SettingsSection title="Preferences" icon={Sliders}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Currency */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Default Currency
            </label>
            <select
              id="pref-currency"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Payment method */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Default Payment Method
            </label>
            <select
              id="pref-payment"
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
            >
              {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Date format */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Date Format
            </label>
            <select
              id="pref-dateformat"
              value={dateFormat}
              onChange={e => setDateFormat(e.target.value)}
              className="w-full rounded-input border px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-solid)', color: 'var(--text-primary)' }}
            >
              {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <button
          id="save-prefs-btn"
          onClick={savePreferences}
          className="mt-4 flex items-center gap-2 gradient-primary rounded-input px-4 py-2 text-sm font-semibold text-white"
        >
          {savingPrefs ? <><Check size={13} /> Saved!</> : 'Save Preferences'}
        </button>
      </SettingsSection>

      {/* ══ SECTION 3: Notifications ══════════════════════════ */}
      <SettingsSection title="Notifications" icon={Bell}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Budget Alert Notifications</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Get browser notifications when a budget reaches 80% or is exceeded.
            </p>
          </div>

          {/* Toggle switch */}
          <button
            id="notif-toggle"
            type="button"
            role="switch"
            aria-checked={notifEnabled}
            onClick={toggleNotifications}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors duration-200 flex-shrink-0',
              notifEnabled ? 'bg-indigo-500' : 'bg-slate-600',
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                notifEnabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </SettingsSection>

      {/* ══ SECTION 4: Data Management ════════════════════════ */}
      <SettingsSection title="Data" icon={Database}>
        <div className="space-y-3">
          {/* Export all CSV */}
          <div className="flex items-center justify-between rounded-input border p-4" style={{ borderColor: 'var(--border-solid)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Export All Expenses</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Download a CSV of all your expenses.</p>
            </div>
            <button
              id="export-all-csv-btn"
              onClick={handleExportAll}
              className="flex items-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/5"
              style={{ borderColor: 'var(--border-glow)', color: 'var(--text-muted)' }}
            >
              <Download size={12} /> Export CSV
            </button>
          </div>

          {/* Delete account */}
          <div
            className="flex items-center justify-between rounded-input border p-4"
            style={{ borderColor: 'rgba(239,68,68,0.3)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: '#F87171' }}>Delete Account</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Permanently remove your account and all data.
              </p>
            </div>
            <button
              id="delete-account-btn"
              onClick={() => setAcctDeleteOpen(true)}
              className="rounded-input px-3 py-1.5 text-xs font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* ══ SECTION 5: Danger Zone ════════════════════════════ */}
      <section
        className="card p-5 border"
        style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}
      >
        <div className="flex items-center gap-2 mb-4 pb-4 border-b" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={16} style={{ color: '#EF4444' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#EF4444' }}>Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Delete This Month's Expenses
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Permanently delete all expenses for the current calendar month. Cannot be undone.
            </p>
          </div>
          <button
            id="danger-delete-month-btn"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-input px-3 py-1.5 text-xs font-semibold text-white ml-4 flex-shrink-0"
            style={{ background: '#EF4444' }}
          >
            <Trash2 size={12} /> Delete Month
          </button>
        </div>

        {/* "Type DELETE" confirmation inline */}
        {deleteOpen && (
          <div className="mt-4 animate-fade-in-up space-y-3 rounded-input border p-4" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <p className="text-xs font-semibold" style={{ color: '#F87171' }}>
              Type <code className="bg-red-950/30 px-1 rounded">DELETE</code> to confirm:
            </p>
            <input
              id="danger-confirm-input"
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-input border px-3 py-2 text-sm focus:outline-none"
              style={{
                background:  'var(--bg-primary)',
                borderColor: deleteInput === 'DELETE' ? '#EF4444' : 'var(--border-solid)',
                color:        'var(--text-primary)',
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteOpen(false); setDeleteInput(''); }}
                className="flex-1 rounded-input border px-3 py-2 text-xs transition hover:bg-white/5"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-month-btn"
                onClick={handleDeleteMonthExpenses}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 rounded-input px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                style={{ background: '#EF4444' }}
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Account Delete confirmation modal ─────────────────── */}
      {acctDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="card p-6 w-full max-w-sm mx-4 animate-fade-in-up border" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
            <h3 className="text-base font-bold mb-2" style={{ color: '#F87171' }}>
              ⚠️ Delete Account?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete your account, all expenses, budgets, and reports.
              There is no recovery option. Are you absolutely sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAcctDeleteOpen(false)}
                className="flex-1 rounded-input border px-4 py-2 text-sm hover:bg-white/5"
                style={{ borderColor: 'var(--border-solid)', color: 'var(--text-muted)' }}
              >
                Keep Account
              </button>
              <button
                onClick={() => toast.error('Account deletion requires contacting support.')}
                className="flex-1 rounded-input px-4 py-2 text-sm font-semibold text-white"
                style={{ background: '#EF4444' }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
