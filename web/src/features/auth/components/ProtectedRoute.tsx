'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // If the user is on the main page, leave them there
      if (pathname !== '/') {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dk-bg text-dk-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dk-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
