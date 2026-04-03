import { redirect } from 'next/navigation';

/**
 * @file app/page.tsx
 * @description Main entry point. Automatically redirects visitors to the dashboard.
 * If they are not logged in, the dashboard layout or hooks will redirect them to /login.
 */
export default function RootPage() {
  redirect('/dashboard');
}
