import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { FullPageLoader } from '@/components/Spinner';

// Redirects to /signin if no session. Use to wrap authenticated routes.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [loading, user, navigate]);

  if (loading) return <FullPageLoader />;
  if (!user) return null;
  return <>{children}</>;
}
