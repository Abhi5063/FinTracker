/**
 * @file app/layout.tsx
 * @description Root Next.js App Router layout.
 *   Wraps the entire application with:
 *   - Inter Google Font via next/font
 *   - ThemeProvider (next-themes) for dark/light mode
 *   - Sonner <Toaster /> for global toast notifications
 *   - Global SEO metadata
 * Connected to: globals.css, ThemeProvider, all pages
 * Owner: Frontend Developer
 */

import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

// Simplified font setup to bypass Windows ESM bug with next/font local resolution
const interVariable = '--font-inter';
/* ── SEO Metadata ─────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: 'FinTrack — Personal Finance Tracker',
    template: '%s | FinTrack',
  },
  description:
    'Track every rupee. Own your future. FinTrack helps you monitor expenses, set budgets, and get AI-powered savings suggestions.',
  keywords: ['finance tracker', 'budget', 'expense manager', 'personal finance', 'FinTrack'],
  authors: [{ name: 'FinTrack' }],
  viewport: 'width=device-width, initial-scale=1',
};

export const viewport = {
  themeColor: '#6366F1',
};

/* ── Root Layout Component ────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * suppressHydrationWarning is required when using next-themes
     * because the theme class is applied after hydration. Without it,
     * React would warn about a server/client class mismatch.
     */
    <html lang="en" suppressHydrationWarning className={interVariable}>
      <body className="font-sans">
        {/*
         * attribute="class" — next-themes adds "dark" or "light" class to <html>
         * defaultTheme="dark" — start in dark mode per design spec
         * enableSystem={false} — we default to dark, not OS preference
         */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}

          {/* Global toast notification portal — appears top-right */}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-glow)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
