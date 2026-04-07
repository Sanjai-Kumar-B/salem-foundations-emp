'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/shared/Sidebar';
import { LoadingSpinner } from '@/components/ui';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, employee, loading, isAdmin } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user || !employee) {
                router.push('/login');
            } else if (!isAdmin) {
                router.push('/counsellor/dashboard');
            }
        }
    }, [user, employee, loading, isAdmin, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return <DashboardLayout role="ADMIN">{children}</DashboardLayout>;
}
