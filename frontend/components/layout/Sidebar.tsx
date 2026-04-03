'use client';

/**
 * @file components/layout/Sidebar.tsx
 * @description Animated, collapsible navigation sidebar for FinTrack.
 *   - Expanded (240px) / Collapsed (72px) states with smooth CSS transition
 *   - On mobile (< lg): hidden by default, slides in as a full overlay when toggled
 *   - Active route is highlighted with indigo glow + left border accent
 *   - Renders nav items: Dashboard, Expenses, Budget, Reports, Settings
 *   - Exposes a collapse toggle button at the bottom
 *   - Listens for keyboard shortcut 'N' to open Add Expense modal (dispatches custom event)
 * Connected to: DashboardLayout, Navbar.tsx (receives isMobileOpen prop via global state)
 * Owner: Frontend Developer
 *
 * Props: none (manages its own state; mobile open/close comes from Navbar via window event)
 */

import { useState, useEffect, useCallback } from 'react';
import Link             from 'next/link';
import { usePathname }  from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

/* ── Navigation Items Config ──────────────────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Expenses',  href: '/expenses',  icon: Receipt },
  { label: 'Budget',    href: '/budget',    icon: PiggyBank },
  { label: 'Reports',   href: '/reports',   icon: BarChart3 },
  { label: 'Settings',  href: '/settings',  icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  /* ── Local State ──────────────────────────────────────────────────── */
  // Desktop collapse state (starts expanded)
  const [collapsed, setCollapsed]       = useState(false);
  // Mobile overlay open state
  const [mobileOpen, setMobileOpen]     = useState(false);

  /* ── Keyboard Shortcut: 'N' → Add Expense ─────────────────────────── */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input, textarea, or select
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

    if (e.key === 'n' || e.key === 'N') {
      // Dispatch a custom event that the Expenses page listens for
      window.dispatchEvent(new CustomEvent('fintrack:open-add-expense'));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ── Listen for mobile toggle from Navbar ─────────────────────────── */
  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev);
    window.addEventListener('fintrack:toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('fintrack:toggle-mobile-sidebar', handler);
  }, []);

  /* ── Close mobile sidebar on route change ─────────────────────────── */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* ── Sync CSS variable with collapse state ────────────────────────── */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w',
      collapsed ? 'var(--sidebar-w-collapsed)' : '240px',
    );
  }, [collapsed]);

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Mobile Overlay Backdrop ────────────────────────────────────
          Rendered behind the sidebar when mobile menu is open.
          Clicking it closes the sidebar.
      ──────────────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar Shell ─────────────────────────────────────────────
          - Fixed position, full height
          - Width transitions between collapsed (72px) and expanded (240px)
          - On mobile: hidden off-screen; slides in when mobileOpen=true
      ──────────────────────────────────────────────────────────────── */}
      <aside
        id="sidebar"
        aria-label="Main navigation"
        className={cn(
          // Base: fixed, full height, always on the left
          'fixed left-0 top-0 z-40 flex h-screen flex-col',
          'border-r transition-all duration-350 ease-out-expo',
          'overflow-hidden select-none',
          // Desktop width (toggles between expanded / collapsed)
          collapsed ? 'w-[72px]' : 'w-[240px]',
          // Mobile: translate off-screen unless open
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background:   'var(--bg-secondary)',
          borderColor:  'var(--border-glow)',
        }}
      >
        {/* ── Logo / Brand ─────────────────────────────────────────── */}
        <div
          className={cn(
            'flex h-16 items-center gap-3 px-4 flex-shrink-0',
            'border-b',
          )}
          style={{ borderColor: 'var(--border-glow)' }}
        >
          {/* App icon — always visible */}
          <div className="gradient-primary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-card shadow-glow">
            <TrendingUp size={18} className="text-white" />
          </div>

          {/* App name — fades out when collapsed */}
          <span
            className={cn(
              'whitespace-nowrap text-base font-bold tracking-tight transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
            )}
            style={{ color: 'var(--text-primary)' }}
          >
            Fin<span style={{ color: 'var(--color-primary)' }}>Track</span>
          </span>

          {/* Mobile close button */}
          <button
            className="ml-auto flex h-7 w-7 items-center justify-center rounded lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Quick Add Expense Button ──────────────────────────────── */}
        <div className="px-3 py-3 flex-shrink-0">
          <button
            id="quick-add-expense-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('fintrack:open-add-expense'))}
            className={cn(
              'gradient-primary flex w-full items-center gap-2.5 rounded-card px-3 py-2.5',
              'text-white text-sm font-semibold shadow-glow transition-all duration-200',
              'hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Add Expense (N)' : undefined}
            aria-label="Add new expense"
          >
            <Plus size={16} className="flex-shrink-0" />
            <span
              className={cn(
                'whitespace-nowrap transition-all duration-300 overflow-hidden',
                collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
              )}
            >
              Add Expense
            </span>
          </button>
        </div>

        {/* ── Navigation Links ─────────────────────────────────────────
            Each item: icon (always visible) + label (hidden when collapsed)
        ──────────────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-2" role="navigation">
          <ul className="space-y-1" role="list">
            {NAV_ITEMS.map((item) => {
              // Check if this nav item matches the current route
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon     = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-card px-3 py-2.5',
                      'text-sm font-medium transition-all duration-200',
                      // Active state: indigo background + left border accent
                      isActive
                        ? 'text-white shadow-glow-sm'
                        : 'hover:bg-white/5',
                      // Center icon when collapsed
                      collapsed && 'justify-center px-2',
                    )}
                    style={
                      isActive
                        ? { background: 'rgba(99,102,241,0.18)', color: '#818CF8', borderLeft: '2px solid var(--color-primary)' }
                        : { color: 'var(--text-muted)' }
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Nav icon — scales slightly on hover */}
                    <Icon
                      size={18}
                      className={cn(
                        'flex-shrink-0 transition-all duration-200',
                        isActive ? 'text-indigo-400' : 'group-hover:text-indigo-400',
                      )}
                    />

                    {/* Nav label — hidden when collapsed */}
                    <span
                      className={cn(
                        'whitespace-nowrap transition-all duration-300 overflow-hidden',
                        collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                      )}
                    >
                      {item.label}
                    </span>

                    {/* Optional badge (e.g. notification count) */}
                    {item.badge !== undefined && !collapsed && (
                      <span className="badge badge-danger ml-auto">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Keyboard Shortcut Hint ────────────────────────────────── */}
        {!collapsed && (
          <div
            className="px-4 py-3 flex-shrink-0 border-t"
            style={{ borderColor: 'var(--border-glow)' }}
          >
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              Press <kbd className="kbd">N</kbd> to add expense
            </p>
          </div>
        )}

        {/* ── Collapse Toggle ───────────────────────────────────────── */}
        <div
          className="px-3 py-3 flex-shrink-0 border-t"
          style={{ borderColor: 'var(--border-glow)' }}
        >
          <button
            id="sidebar-collapse-btn"
            onClick={() => setCollapsed(prev => !prev)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-card p-2.5',
              'text-sm font-medium transition-all duration-200',
              'hover:bg-white/5',
              collapsed && 'justify-center',
            )}
            style={{ color: 'var(--text-muted)' }}
          >
            {/* Chevron flips direction based on state */}
            {collapsed
              ? <ChevronRight size={16} />
              : <ChevronLeft  size={16} />
            }
            <span
              className={cn(
                'whitespace-nowrap transition-all duration-300 overflow-hidden',
                collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
              )}
            >
              Collapse
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
