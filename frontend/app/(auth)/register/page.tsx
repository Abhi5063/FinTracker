'use client';

/**
 * @file app/(auth)/register/page.tsx
 * @description Full-screen split registration page for FinTrack.
 *   LEFT PANEL  : Dark form with: Name, Email, Password (+ strength bar), Confirm Password,
 *                 show/hide toggles, inline validation errors, loading state.
 *   RIGHT PANEL : Same animated gradient as login with feature highlights.
 * Connected to: hooks/useAuth.ts, lib/utils.ts (getPasswordStrength), /login page
 * Owner: Frontend Developer
 */

import { useState, useEffect, useRef } from 'react';
import Link                            from 'next/link';
import { Eye, EyeOff, TrendingUp, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth }              from '@/hooks/useAuth';
import { getPasswordStrength, cn } from '@/lib/utils';

export default function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuth();

  /* ── Form State ─────────────────────────────────────────────────── */
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* Local validation errors (client-side only) */
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /* Auto-focus name field on mount */
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  /* ── Password Strength ───────────────────────────────────────────── */
  const strength = getPasswordStrength(password);

  /* ── Validate fields before submission ───────────────────────────── */
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPass) {
      errors.confirmPass = 'Passwords do not match.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Submit Handler ──────────────────────────────────────────────── */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    await register({ name: name.trim(), email: email.trim().toLowerCase(), password, confirmPassword: confirmPass });
  };

  /* Clear global error whenever any field changes */
  const handleChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    clearError();
    setValidationErrors({});
  };

  /* ── Password strength colour + label ─────────────────────────────── */
  const strengthConfig = {
    weak:   { color: '#EF4444', label: 'Weak',   width: '33%'  },
    medium: { color: '#F59E0B', label: 'Medium', width: '66%'  },
    strong: { color: '#10B981', label: 'Strong', width: '100%' },
  }[strength.label] ?? { color: '#EF4444', label: 'Weak', width: '33%' };

  return (
    <div className="flex min-h-screen">

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL — Register Form
      ════════════════════════════════════════════════════════════ */}
      <div
        className="flex w-full flex-col justify-center overflow-y-auto px-6 py-12 lg:w-1/2 xl:px-20"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="mx-auto w-full max-w-md">

          {/* ── Brand ─────────────────────────────────────────────── */}
          <div className="mb-8 flex items-center gap-3">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-card shadow-glow">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Fin<span style={{ color: 'var(--color-primary)' }}>Track</span>
            </span>
          </div>

          {/* ── Heading ───────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Create your account
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Start tracking your finances — it&apos;s free.
            </p>
          </div>

          {/* ── Form ──────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Full Name */}
            <div className="space-y-1">
              <div className="float-wrapper">
                <input
                  ref={nameRef}
                  id="reg-name"
                  type="text"
                  placeholder=" "
                  value={name}
                  onChange={e => handleChange(setName)(e.target.value)}
                  autoComplete="name"
                  disabled={isLoading}
                  aria-label="Full name"
                  aria-describedby={validationErrors.name ? 'name-error' : undefined}
                  aria-invalid={!!validationErrors.name}
                />
                <label htmlFor="reg-name" className="float-label">Full name</label>
              </div>
              {/* Inline field error */}
              {validationErrors.name && (
                <FieldError id="name-error" message={validationErrors.name} />
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <div className="float-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={e => handleChange(setEmail)(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                  aria-label="Email address"
                  aria-invalid={!!validationErrors.email}
                />
                <label htmlFor="reg-email" className="float-label">Email address</label>
              </div>
              {validationErrors.email && (
                <FieldError id="email-error" message={validationErrors.email} />
              )}
            </div>

            {/* Password + Strength Indicator */}
            <div className="space-y-2">
              <div className="float-wrapper">
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder=" "
                  value={password}
                  onChange={e => handleChange(setPassword)(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-label="Password"
                  aria-invalid={!!validationErrors.password}
                  style={{ paddingRight: '3rem' }}
                />
                <label htmlFor="reg-password" className="float-label">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar — only shown while typing */}
              {password.length > 0 && (
                <div className="animate-fade-in-up space-y-1">
                  <div className="progress-track" style={{ height: '5px' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:      strengthConfig.width,
                        background: strengthConfig.color,
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium" style={{ color: strengthConfig.color }}>
                    Password strength: {strengthConfig.label}
                  </p>
                </div>
              )}

              {validationErrors.password && (
                <FieldError id="password-error" message={validationErrors.password} />
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <div className="float-wrapper">
                <input
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder=" "
                  value={confirmPass}
                  onChange={e => handleChange(setConfirmPass)(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-label="Confirm password"
                  aria-invalid={!!validationErrors.confirmPass}
                  style={{ paddingRight: '3rem' }}
                />
                <label htmlFor="reg-confirm-password" className="float-label">Confirm password</label>
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password match indicator */}
              {confirmPass.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs animate-fade-in-up">
                  {password === confirmPass ? (
                    <><CheckCircle2 size={12} style={{ color: '#10B981' }} />
                      <span style={{ color: '#10B981' }}>Passwords match</span></>
                  ) : (
                    <><XCircle size={12} style={{ color: '#EF4444' }} />
                      <span style={{ color: '#EF4444' }}>Passwords do not match</span></>
                  )}
                </div>
              )}

              {validationErrors.confirmPass && (
                <FieldError id="confirm-error" message={validationErrors.confirmPass} />
              )}
            </div>

            {/* ── API / Backend Error ──────────────────────────────── */}
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

            {/* ── Submit ───────────────────────────────────────────── */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading || !name || !email || !password || !confirmPass}
              className={cn(
                'gradient-primary flex w-full items-center justify-center gap-2.5',
                'rounded-input px-4 py-3 font-semibold text-white shadow-glow',
                'transition-all duration-200 hover:scale-[1.01]',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100',
              )}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <><span className="spinner" aria-hidden /> Creating account…</>
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* ── Login Link ─────────────────────────────────────────── */}
          <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — Animated Gradient (hidden on mobile)
      ════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gradient-auth px-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full opacity-10"
             style={{ background: 'var(--color-accent)' }} />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-10"
             style={{ background: 'var(--color-primary)' }} />

        <div className="relative z-10 max-w-md text-center">
          <div className="gradient-accent mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-card shadow-accent animate-pulse-glow">
            <TrendingUp size={40} className="text-white" />
          </div>

          <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
            Your financial
            <br />
            <span style={{ color: 'var(--color-accent)' }}>clarity starts here.</span>
          </h2>

          <p className="text-base leading-relaxed mb-10" style={{ color: 'var(--text-muted)' }}>
            Join thousands who use FinTrack to take control of spending, automate budget tracking,
            and make smarter financial decisions.
          </p>

          {/* Steps */}
          {[
            { step: '1', text: 'Create your free account' },
            { step: '2', text: 'Add your income & expenses' },
            { step: '3', text: 'Get AI insights & save more' },
          ].map(s => (
            <div key={s.step} className="glass flex items-center gap-3 rounded-card px-4 py-3 text-sm text-left mb-3">
              <div className="gradient-accent flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                {s.step}
              </div>
              <span style={{ color: 'var(--text-primary)' }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable field error sub-component ───────────────────────────── */
function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-center gap-1 text-xs animate-fade-in-up" style={{ color: 'var(--color-danger)' }} role="alert">
      <XCircle size={12} />
      {message}
    </p>
  );
}
