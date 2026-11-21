'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import MobileDock from '@/components/counsellor/MobileDock';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    ClipboardList,
    BarChart3,
    LogOut,
    Menu,
    X,
    Phone,
    CalendarCheck,
    MessageSquare,
    User,
    ChevronRight,
} from 'lucide-react';

interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Employees', href: '/admin/employees', icon: <Users size={20} /> },
    { name: 'Leads', href: '/admin/leads', icon: <UserPlus size={20} /> },
    { name: 'Leads Assignment', href: '/admin/assignments', icon: <ClipboardList size={20} /> },
    { name: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} /> },
    { name: 'WhatsApp Templates', href: '/admin/whatsapp', icon: <MessageSquare size={20} /> },
    { name: 'Profile', href: '/admin/profile', icon: <User size={20} /> },
];

const counsellorNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/counsellor/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Lead Workspace', href: '/counsellor/workspace', icon: <Phone size={20} /> },
    { name: "Today's Calls", href: '/counsellor/todays-calls', icon: <CalendarCheck size={20} /> },
];

interface SidebarProps {
    role: 'ADMIN' | 'COUNSELLOR';
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const { employee, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = role === 'ADMIN' ? adminNavItems : counsellorNavItems;

    const NavContent = () => (
        <>
            {/* Logo/Brand */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-1 shadow-2xs shrink-0">
                    <img src="/logo_eng.jpg" alt="Salem Foundations" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold text-gray-900 truncate">Salem Foundations</h1>
                    <p className="text-xs text-gray-500 truncate">{role === 'ADMIN' ? 'Admin Portal' : 'Counsellor'}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            )}
                        >
                            <span className={cn(isActive ? 'text-blue-600' : 'text-gray-400')}>{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile Card (Sign out moved inside profile) */}
            <div className="border-t border-gray-200 p-3">
                <Link
                    href={role === 'ADMIN' ? '/admin/profile' : '/counsellor/profile'}
                    className={cn(
                        'flex items-center gap-3 p-2.5 rounded-xl transition-all border group',
                        pathname.includes('/profile')
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                    )}
                >
                    <div className="w-9 h-9 bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center shrink-0">
                        {employee?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 truncate">{employee?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{role === 'ADMIN' ? 'Admin Profile' : 'Staff Profile'}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
                <NavContent />
            </aside>

            {/* Mobile Header & Menu */}
            <div className="lg:hidden">
                {/* Mobile Header */}
                <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">EM</span>
                            </div>
                            <span className="font-semibold text-gray-900">Employee Mgmt</span>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40 bg-black/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col">
                            <NavContent />
                        </aside>
                    </>
                )}
            </div>
        </>
    );
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    role: 'ADMIN' | 'COUNSELLOR';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();

    const activeTab =
        pathname?.includes('/todays-calls') ? 'calls' :
        pathname?.includes('/follow-ups') ? 'followups' :
        pathname?.includes('/workspace') ? 'queue' :
        'calls';

    const handleDockChange = (tab: 'queue' | 'calls' | 'followups' | 'whatsapp') => {
        if (tab === 'queue') {
            router.push('/counsellor/workspace');
            return;
        }

        if (tab === 'calls') {
            router.push('/counsellor/todays-calls');
            return;
        }

        if (tab === 'followups') {
            router.push('/counsellor/follow-ups');
            return;
        }

        router.push('/counsellor/workspace');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar role={role} />
            <main className="lg:pl-64">
                <div className="pt-16 pb-28 lg:pt-0 lg:pb-0">
                    {children}
                </div>
                {role === 'COUNSELLOR' && (
                    <MobileDock
                        active={activeTab as 'queue' | 'calls' | 'followups' | 'whatsapp'}
                        onChange={handleDockChange}
                        onPrimaryAction={() => router.push('/counsellor/todays-calls')}
                    />
                )}
            </main>
        </div>
    );
}
