'use client';

/**
 * @file components/layout/ThemeToggle.tsx
 * @description Animated dark/light mode toggle button.
 *   Renders a Sun icon in dark mode and a Moon icon in light mode.
 *   Uses next-themes' useTheme() hook to read and set the current theme.
 *   Smooth icon cross-fade via CSS opacity/scale transitions.
 * Connected to: Navbar.tsx, next-themes ThemeProvider in layout.tsx
 * Owner: Frontend Developer
 *
 * Props: none (reads theme from context)
 */

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  /*
   * next-themes renders on the server with "undefined" theme to avoid hydration
   * mismatch. We delay rendering the icon until after mount to match client state.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /** Toggles between 'dark' and 'light' */
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  /* Don't render anything on the server (prevents hydration mismatch) */
  if (!mounted) {
    return <div className="h-9 w-9 rounded-input" aria-hidden />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      id="theme-toggle-btn"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={cn(
        // Base button styles
        'relative flex h-9 w-9 items-center justify-center rounded-input',
        'transition-all duration-200',
        // Hover: subtle bg glow
        'hover:bg-white/10 hover:shadow-glow-sm',
        // Focus ring for keyboard nav
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      {/*
       * Sun icon — visible when in dark mode (clicking will switch to light).
       * Scale + opacity transition gives a smooth morph effect.
       */}
      <Sun
        size={18}
        className={cn(
          'absolute text-amber-400 transition-all duration-300',
          isDark
            ? 'scale-100 opacity-100 rotate-0'          // Visible in dark
            : 'scale-50  opacity-0  rotate-90',          // Hidden in light
        )}
      />

      {/*
       * Moon icon — visible when in light mode (clicking will switch to dark).
       */}
      <Moon
        size={18}
        className={cn(
          'absolute text-indigo-400 transition-all duration-300',
          !isDark
            ? 'scale-100 opacity-100 rotate-0'           // Visible in light
            : 'scale-50  opacity-0  -rotate-90',         // Hidden in dark
        )}
      />
    </button>
  );
}
