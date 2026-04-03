/**
 * @file tailwind.config.ts
 * @description Tailwind CSS configuration for FinTrack.
 *   Extends the default theme with:
 *   - Custom "fintrack" color palette (maps to CSS variables)
 *   - Inter font family
 *   - Custom border radius tokens (card, input, badge)
 *   - Custom box-shadow tokens (card glow, glow-lg)
 *   - Custom keyframe animations
 * Connected to: frontend/app/globals.css, all components
 * Owner: Frontend Developer
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  // Enable class-based dark mode (controlled by next-themes)
  darkMode: 'class',

  // Scan all source files for class usage
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      /* ── Color Palette ─────────────────────────────────────────────────── */
      colors: {
        // Map to CSS custom properties so theme switching works automatically
        fintrack: {
          primary:   'var(--color-primary)',
          accent:    'var(--color-accent)',
          danger:    'var(--color-danger)',
          warning:   'var(--color-warning)',
          'bg-1':    'var(--bg-primary)',
          'bg-2':    'var(--bg-secondary)',
          'bg-3':    'var(--bg-tertiary)',
          text:      'var(--text-primary)',
          muted:     'var(--text-muted)',
          border:    'var(--border-glow)',
        },
        // Aliased shorthands for quick use
        primary:  '#6366F1',
        accent:   '#10B981',
        danger:   '#EF4444',
        warning:  '#F59E0B',
      },

      /* ── Typography ─────────────────────────────────────────────────────── */
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },

      /* ── Border Radius ──────────────────────────────────────────────────── */
      borderRadius: {
        card:  '12px', // Dashboard cards
        input: '8px',  // Form inputs
        badge: '6px',  // Status badges
      },

      /* ── Box Shadows ────────────────────────────────────────────────────── */
      boxShadow: {
        'card':    '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow':    '0 0 40px rgba(99, 102, 241, 0.28)',
        'glow-sm': '0 0 12px rgba(99, 102, 241, 0.20)',
        'danger':  '0 0 20px rgba(239, 68, 68, 0.20)',
        'accent':  '0 0 20px rgba(16, 185, 129, 0.20)',
        'inner-glow': 'inset 0 0 20px rgba(99, 102, 241, 0.08)',
      },

      /* ── Custom Animations ──────────────────────────────────────────────── */
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.15)' },
          '50%':       { boxShadow: '0 0 42px rgba(99,102,241,0.38)' },
        },
        gradientShift: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in-up':    'fadeInUp 0.45s ease forwards',
        'count-up':      'countUp 0.5s ease forwards',
        'pulse-glow':    'pulseGlow 3s ease-in-out infinite',
        'gradient':      'gradientShift 10s ease infinite',
        'slide-in-left': 'slideInLeft 0.3s ease forwards',
      },

      /* ── Transitions ────────────────────────────────────────────────────── */
      transitionDuration: {
        '350': '350ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      /* ── Backdrop Blur ──────────────────────────────────────────────────── */
      backdropBlur: {
        xs: '2px',
      },
    },
  },

  plugins: [],
};

export default config;
