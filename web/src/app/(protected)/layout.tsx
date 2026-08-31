import ProtectedRoute from '@/features/auth/components/ProtectedRoute';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
