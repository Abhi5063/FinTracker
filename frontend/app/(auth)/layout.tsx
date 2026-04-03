/**
 * @file app/(auth)/layout.tsx
 * @description Layout for the authentication route group: /login, /register.
 *   No sidebar or navbar — full-screen split layout handled per page.
 * Connected to: login/page.tsx, register/page.tsx
 * Owner: Frontend Developer
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // min-h-screen ensures the full viewport is used for the split layout
    <div className="min-h-screen overflow-hidden">
      {children}
    </div>
  );
}
