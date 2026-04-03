'use client';

/**
 * @file components/layout/Navbar.tsx
 * @description Top navigation bar for authenticated dashboard pages.
 *   Renders:
 *   - Mobile hamburger menu (dispatches sidebar toggle event)
 *   - Page title derived from current pathname
 *   - Notification bell with unread badge count
 *   - Currency selector (updates user preferences)
 *   - ThemeToggle component
 *   - User avatar with initials (links to Settings)
 * Connected to: Sidebar.tsx (via window event), ThemeToggle.tsx, useAuth hook
 * Owner: Frontend Developer
 *
 * Props: none (reads auth state from localStorage directly for now)
 */

import { useState, useEffect } from 'react';
import { usePathname }         from 'next/navigation';
import Link                    from 'next/link';
import { Bell, Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import ThemeToggle             from './ThemeToggle';
import { cn, getCurrencySymbol, getInitials } from '@/lib/utils';
import type { CurrencyCode, AppNotification } from '@/types';

/* ── Page title map — derives display title from pathname ──────────── */
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/expenses':  'Expenses',
  '/budget':    'Budget',
  '/reports':   'Reports',
  '/settings':  'Settings',
};

/* ── Supported currencies for the selector ────────────────────────── */
const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'INR', label: '₹ INR' },
  { code: 'USD', label: '$ USD' },
  { code: 'EUR', label: '€ EUR' },
  { code: 'GBP', label: '£ GBP' },
];

/* ── Mock notifications (replace with real API call later) ─────────── */
const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Budget Alert',
    message: 'Food & Dining is at 82% of your monthly budget.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'danger',
    title: 'Over Budget',
    message: 'Shopping exceeded limit by ₹1,200.',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

export default function Navbar() {
  const pathname    = usePathname();

  /* ── State ─────────────────────────────────────────────────────── */
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [avatarOpen,   setAvatarOpen]   = useState(false);
  const [currency,     setCurrency]     = useState<CurrencyCode>('INR');
  const [userName,     setUserName]     = useState('User');
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);

  /* Count of unread notifications */
  const unreadCount = notifications.filter(n => !n.read).length;

  /* ── Derive page title from pathname ─────────────────────────────── */
  const pageTitle = PAGE_TITLES[pathname] ?? 'FinTrack';

  /* ── Load user from localStorage on mount ────────────────────────── */
  useEffect(() => {
    try {
      const raw   = localStorage.getItem('fintrack_user');
      const user  = raw ? JSON.parse(raw) : null;
      if (user?.name)     setUserName(user.name);
      if (user?.currency) setCurrency(user.currency as CurrencyCode);
    } catch {
      // Silently fall back to defaults
    }
  }, []);

  /* ── Close dropdowns when clicking outside ───────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#notif-dropdown-wrapper')) setNotifOpen(false);
      if (!target.closest('#avatar-dropdown-wrapper')) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Mark all notifications read ─────────────────────────────────── */
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  /* ── Currency change handler ─────────────────────────────────────── */
  const handleCurrencyChange = (code: CurrencyCode) => {
    setCurrency(code);
    // Persist to localStorage so the whole app picks it up
    try {
      const raw  = localStorage.getItem('fintrack_user');
      const user = raw ? JSON.parse(raw) : {};
      localStorage.setItem('fintrack_user', JSON.stringify({ ...user, currency: code }));
    } catch { /* ignore */ }
  };

  /* ── Logout ──────────────────────────────────────────────────────── */
  const handleLogout = () => {
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem('fintrack_user');
    window.location.href = '/login';
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <header
      id="top-navbar"
      className={cn(
        'flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-6',
        'border-b glass sticky top-0 z-20',
      )}
      style={{ borderColor: 'var(--border-glow)' }}
      role="banner"
    >
      {/* ── Left: Hamburger (mobile) + Page Title ─────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — toggles sidebar via custom event */}
        <button
          id="mobile-menu-btn"
          className="flex h-9 w-9 items-center justify-center rounded-input hover:bg-white/10 lg:hidden"
          onClick={() => window.dispatchEvent(new CustomEvent('fintrack:toggle-mobile-sidebar'))}
          aria-label="Open navigation menu"
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu size={20} />
        </button>

        {/* Current page title */}
        <h1 className="text-base font-semibold md:text-lg" style={{ color: 'var(--text-primary)' }}>
          {pageTitle}
        </h1>
      </div>

      {/* ── Right: Controls ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 md:gap-2">

        {/* ── Currency Selector ─────────────────────────────────────── */}
        <div className="hidden sm:block">
          <select
            id="currency-selector"
            value={currency}
            onChange={e => handleCurrencyChange(e.target.value as CurrencyCode)}
            aria-label="Select currency"
            className={cn(
              'rounded-input px-2 py-1.5 text-xs font-semibold',
              'border transition-all duration-200 cursor-pointer',
              'focus:outline-none focus:ring-2',
            )}
            style={{
              background:   'var(--bg-tertiary)',
              color:        'var(--text-primary)',
              borderColor:  'var(--border-solid)',
            }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* ── Theme Toggle ─────────────────────────────────────────── */}
        <ThemeToggle />

        {/* ── Notification Bell ────────────────────────────────────── */}
        <div id="notif-dropdown-wrapper" className="relative">
          <button
            id="notif-bell-btn"
            aria-label={`Notifications (${unreadCount} unread)`}
            onClick={() => { setNotifOpen(prev => !prev); setAvatarOpen(false); }}
            className="relative flex h-9 w-9 items-center justify-center rounded-input hover:bg-white/10 transition-all duration-200"
            style={{ color: 'var(--text-muted)' }}
          >
            <Bell size={18} />
            {/* Red badge only if there are unread notifications */}
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div
              className={cn(
                'absolute right-0 top-full mt-2 w-80 rounded-card border p-2 shadow-glow',
                'animate-fade-in-up',
              )}
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-glow)' }}
              role="dialog"
              aria-label="Notifications"
            >
              {/* Dropdown header */}
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification items */}
              <ul className="space-y-1 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <li className="px-2 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    All caught up! 🎉
                  </li>
                ) : (
                  notifications.map(n => (
                    <li
                      key={n.id}
                      className={cn(
                        'rounded-input px-3 py-2.5 cursor-pointer transition-all duration-150',
                        !n.read && 'border-l-2',
                        n.type === 'danger'  && 'border-red-500',
                        n.type === 'warning' && 'border-amber-500',
                        n.type === 'success' && 'border-emerald-500',
                      )}
                      style={{ background: !n.read ? 'rgba(99,102,241,0.06)' : 'transparent' }}
                    >
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {n.message}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── User Avatar Dropdown ─────────────────────────────────── */}
        <div id="avatar-dropdown-wrapper" className="relative">
          <button
            id="user-avatar-btn"
            onClick={() => { setAvatarOpen(prev => !prev); setNotifOpen(false); }}
            aria-label="User menu"
            className="flex items-center gap-2 rounded-card px-2 py-1.5 transition-all duration-200 hover:bg-white/10"
          >
            {/* Gradient avatar with initials */}
            <div className="gradient-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-glow">
              {getInitials(userName)}
            </div>
            {/* Name (hidden on small screens) */}
            <span className="hidden text-sm font-medium md:block" style={{ color: 'var(--text-primary)' }}>
              {userName.split(' ')[0]}
            </span>
            <ChevronDown size={14} className="hidden md:block" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Avatar dropdown menu */}
          {avatarOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-card border p-1.5 shadow-glow animate-fade-in-up"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-glow)' }}
              role="menu"
            >
              {/* User info summary */}
              <div className="px-3 py-2 mb-1 border-b" style={{ borderColor: 'var(--border-solid)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {getCurrencySymbol(currency)} {currency}
                </p>
              </div>

              {/* Profile link */}
              <Link
                href="/settings"
                className="flex items-center gap-2.5 rounded-input px-3 py-2 text-sm transition-all duration-150 hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
                role="menuitem"
              >
                <UserIcon size={14} /> Profile & Settings
              </Link>

              {/* Logout */}
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-input px-3 py-2 text-sm transition-all duration-150 hover:bg-red-500/10"
                style={{ color: 'var(--color-danger)' }}
                role="menuitem"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
