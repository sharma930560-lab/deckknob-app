/**
 * MainLayout — Authenticated route wrapper
 * Delegates all layout and navigation to <AppShell>
 */

import { Navigate, Outlet } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import authStore from '../stores/authStore';

export default function MainLayout() {
  const { isAuthenticated, isLoading } = authStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090B]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#DFE104]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}
