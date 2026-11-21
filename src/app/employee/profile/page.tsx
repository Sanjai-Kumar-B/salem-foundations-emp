'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/counsellor/profile');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-xs font-semibold text-slate-500 animate-pulse">
        Loading employee profile...
      </div>
    </div>
  );
}
