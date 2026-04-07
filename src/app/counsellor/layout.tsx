'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/shared/Sidebar';
import { LoadingSpinner } from '@/components/ui';

export default function CounsellorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, employee, loading, isCounsellor } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user || !employee) {
                router.push('/login');
            } else if (!isCounsellor) {
                router.push('/admin/dashboard');
            }
        }
    }, [user, employee, loading, isCounsellor, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!isCounsellor) {
        return null;
    }

    return <DashboardLayout role="COUNSELLOR">{children}</DashboardLayout>;
}
