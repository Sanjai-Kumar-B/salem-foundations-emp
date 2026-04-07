'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();
  const { user, employee, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout fallback - redirect to login after 5 seconds if still loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimedOut(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!loading || timedOut) {
      if (!user || !employee) {
        router.push('/login');
      } else if (employee.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/counsellor/dashboard');
      }
    }
  }, [user, employee, loading, router, timedOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
