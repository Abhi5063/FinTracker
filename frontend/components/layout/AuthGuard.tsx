'use client';

/**
 * @file components/layout/AuthGuard.tsx
 * @description Client-side wrapper to protect dashboard routes.
 * Ensures that any unauthenticated visitor is immediately kicked out to /login
 * before the dashboard UI or private data can be rendered.
 * Owner: Frontend Developer
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If auth state has finished loading and the user is NOT authenticated, boot them.
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Show nothing (or a spinner) while waiting for hydration and auth check
  if (!mounted || isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return <>{children}</>;
}
