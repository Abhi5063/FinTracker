/**
 * @file app/(dashboard)/layout.tsx
 * @description Shared layout for all authenticated dashboard pages.
 *   Renders the collapsible Sidebar on the left and Navbar at the top.
 *   Main content area scrolls independently.
 * Connected to: Sidebar.tsx, Navbar.tsx, all dashboard pages
 * Owner: Frontend Developer
 */

import Sidebar from '@/components/layout/Sidebar';
import Navbar  from '@/components/layout/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * flex h-screen: full-height flex container that never scrolls itself.
     * Sidebar is fixed-position, so we offset the content with left margin.
     */
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Animated Collapsible Sidebar ──────────────────────────────── */}
      <Sidebar />

      {/*
       * flex-1 column that takes remaining width.
       * overflow-hidden prevents horizontal scroll bleed.
       * Sidebar width is 240px (--sidebar-w); on mobile it overlays.
       */}
      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-350"
        style={{ marginLeft: 'var(--sidebar-w)' }}
        id="dashboard-main"
      >
        {/* ── Top Navigation Bar ─────────────────────────────────────── */}
        <Navbar />

        {/* ── Page Content Area ─────────────────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto p-6 md:p-8"
          id="main-content"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
