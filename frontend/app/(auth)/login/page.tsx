'use client';

/**
 * @file app/(auth)/login/page.tsx
 * @description Full-screen split login page for FinTrack.
 *   LEFT PANEL  : Dark card with floating-label form (email + password),
 *                 "Remember me", Forgot password link, Google OAuth placeholder,
 *                 loading spinner, inline API error messages.
 *   RIGHT PANEL : Animated gradient background with app tagline.
 *   UX extras  : Enter key submits form; real-time error clearing on input change.
 * Connected to: hooks/useAuth.ts, lib/api.ts, /register page
 * Owner: Frontend Developer
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, TrendingUp, ArrowRight, Chrome } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';

// Note: metadata export won't work in 'use client' — move to a parent server component if needed.
// Left here as a comment for reference: title: 'Sign In | FinTrack'

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();

  /* ── Form State ─────────────────────────────────────────────────── */
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass,   setShowPass]   = useState(false);

  /* Auto-focus email field on mount */
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  /* ── Handle Form Submit ──────────────────────────────────────────── */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password) return;
    await login({ email: email.trim().toLowerCase(), password, rememberMe });
  };

  /* ── Enter key submits the form ──────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  /* ── Clear error when user begins correcting their input ─────────── */
  const handleEmailChange = (v: string)    => { setEmail(v);    clearError(); };
  const handlePasswordChange = (v: string) => { setPassword(v); clearError(); };

  return (
    <div className="flex min-h-screen" onKeyDown={handleKeyDown}>

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL — Login Form
      ════════════════════════════════════════════════════════════ */}
      <div
        className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 xl:px-20"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="mx-auto w-full max-w-md">

          {/* ── Brand ─────────────────────────────────────────────── */}
          <div className="mb-10 flex items-center gap-3">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-card shadow-glow">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Fin<span style={{ color: 'var(--color-primary)' }}>Track</span>
            </span>
          </div>

          {/* ── Heading ───────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to continue managing your finances.
            </p>
          </div>

          {/* ── Form ──────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email Field (floating label) */}
            <div className="float-wrapper">
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                placeholder=" "
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                autoComplete="email"
                required
                disabled={isLoading}
                aria-label="Email address"
              />
              <label htmlFor="login-email" className="float-label">Email address</label>
            </div>

            {/* Password Field (floating label + show/hide toggle) */}
            <div className="float-wrapper">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                placeholder=" "
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
                aria-label="Password"
                style={{ paddingRight: '3rem' }}
              />
              <label htmlFor="login-password" className="float-label">Password</label>

              {/* Show/Hide toggle */}
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500 cursor-pointer"
                />
                Remember me
              </label>

              {/* Forgot password — placeholder route */}
              <Link
                href="/forgot-password"
                className="font-medium transition-colors duration-150 hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Forgot password?
              </Link>
            </div>

            {/* ── Inline Error Message ─────────────────────────────── */}
            {error && (
              <div
                className="rounded-input border px-4 py-3 text-sm animate-fade-in-up"
                style={{
                  background:  'rgba(239,68,68,0.08)',
                  borderColor: 'rgba(239,68,68,0.3)',
                  color:       'var(--color-danger)',
                }}
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* ── Submit Button ────────────────────────────────────── */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading || !email || !password}
              className={cn(
                'gradient-primary flex w-full items-center justify-center gap-2.5',
                'rounded-input px-4 py-3 font-semibold text-white shadow-glow',
                'transition-all duration-200 hover:shadow-glow hover:scale-[1.01]',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100',
              )}
              aria-busy={isLoading}
            >
              {/* Show spinner while loading, otherwise arrow icon */}
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* ── Divider ──────────────────────────────────────────── */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="h-px flex-1" style={{ background: 'var(--border-solid)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="h-px flex-1" style={{ background: 'var(--border-solid)' }} />
            </div>

            {/* ── Google OAuth (disabled — Coming Soon) ────────────── */}
            <div className="relative group">
              <button
                type="button"
                disabled
                title="Google Sign-In is coming soon!"
                className={cn(
                  'flex w-full items-center justify-center gap-3 rounded-input border px-4 py-3',
                  'text-sm font-medium cursor-not-allowed opacity-50',
                  'transition-all duration-200',
                )}
                style={{
                  background:  'var(--bg-tertiary)',
                  borderColor: 'var(--border-solid)',
                  color:       'var(--text-muted)',
                }}
              >
                <Chrome size={16} />
                Continue with Google
                <span className="badge badge-warning ml-auto text-[10px]">Soon</span>
              </button>
              {/* Tooltip on hover */}
              <div
                className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-solid)' }}
              >
                Google OAuth coming soon
              </div>
            </div>
          </form>

          {/* ── Register Link ──────────────────────────────────────── */}
          <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-semibold transition-colors duration-150 hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Create one free
            </Link>
          </p>

          {/* ── Keyboard hint ─────────────────────────────────────── */}
          <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Press <kbd className="kbd">Enter</kbd> to sign in
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — Animated Gradient with Tagline (hidden on mobile)
      ════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gradient-auth px-12 relative overflow-hidden">

        {/* Decorative background circles */}
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full opacity-10"
             style={{ background: 'var(--color-primary)' }} />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-10"
             style={{ background: 'var(--color-accent)' }} />

        {/* Content */}
        <div className="relative z-10 max-w-md text-center">
          {/* Large icon */}
          <div className="gradient-primary mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-card shadow-glow animate-pulse-glow">
            <TrendingUp size={40} className="text-white" />
          </div>

          <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
            Track every rupee.
            <br />
            <span style={{ color: 'var(--color-primary)' }}>Own your future.</span>
          </h2>

          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            FinTrack gives you AI-powered insights, real-time budget alerts, and
            beautiful spending reports — all in one place.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-3 text-left">
            {[
              { icon: '📊', text: 'Visual spending breakdowns by category' },
              { icon: '🤖', text: 'AI-powered savings suggestions' },
              { icon: '🔔', text: 'Instant alerts when you approach your budget' },
            ].map(f => (
              <div
                key={f.text}
                className="glass flex items-center gap-3 rounded-card px-4 py-3 text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="text-xl">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
