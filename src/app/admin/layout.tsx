'use client';

import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  // Don't show navigation on login page
  const isLoginPage = pathname === '/admin/login';

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #2a2a2a',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Don't show navigation if not authenticated or on login page
  if (isLoginPage || !session?.isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
    }}>
      <Navigation />
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 16px',
      }}>
        {children}
      </main>
    </div>
  );
}
