'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getTodaysTasks, getOverdueTasks } from '@/lib/firestore';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  PhoneCall,
  Calendar,
  CheckSquare,
  Sparkles,
  LogOut,
  Bell,
  Headphones,
  User,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export function CounsellorLayoutContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, signOut } = useAuth();
  const [todayTasksCount, setTodayTasksCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (!employee) return;
    const fetchCounts = async () => {
      try {
        const [today, overdue] = await Promise.all([
          getTodaysTasks(employee.id),
          getOverdueTasks(employee.id),
        ]);
        setTodayTasksCount(today.length);
        setOverdueCount(overdue.length);
      } catch (e) {
        console.error('Failed to load nav badges', e);
      }
    };
    fetchCounts();
  }, [employee, pathname]);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      href: '/counsellor/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'workspace',
      label: 'Calls',
      href: '/counsellor/workspace',
      icon: PhoneCall,
    },
    {
      id: 'todays-calls',
      label: 'Schedule',
      href: '/counsellor/todays-calls',
      icon: Calendar,
      badge: todayTasksCount > 0 ? todayTasksCount : undefined,
    },
    {
      id: 'follow-ups',
      label: 'Follow-ups',
      href: '/counsellor/follow-ups',
      icon: CheckSquare,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
  ];

  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Overview';
    if (pathname.includes('/workspace')) return 'Telecalling Workspace';
    if (pathname.includes('/todays-calls')) return "Today's Schedule";
    if (pathname.includes('/follow-ups')) return 'Follow-up Tasks';
    if (pathname.includes('/new-leads')) return 'New Leads Pool';
    if (pathname.includes('/profile')) return 'My Profile';
    return 'Counsellor Portal';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row antialiased">
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR (lg and up)                               */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30 shadow-sm">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Headphones size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm tracking-tight leading-none">
                Salem Foundations
              </div>
              <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                Counsellor Workspace
              </div>
            </div>
          </div>
        </div>

        {/* Counsellor Profile Pill */}
        <div className="px-4 py-4 border-b border-slate-100">
          <Link
            href="/counsellor/profile"
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all group",
              pathname === '/counsellor/profile'
                ? "bg-blue-50/80 border-blue-200"
                : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-slate-100/60"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
              {getInitials(employee?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                {employee?.name || 'Counsellor'}
              </div>
              <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Active • My Profile
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-400 px-3 pb-2 uppercase tracking-wider">
            Primary Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/counsellor/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={19}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      isActive
                        ? 'bg-white text-blue-700'
                        : item.id === 'follow-ups' && overdueCount > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 text-[11px] font-semibold text-slate-400 px-3 pb-2 uppercase tracking-wider">
            Lead Pipelines
          </div>
          <Link
            href="/counsellor/new-leads"
            className={cn(
              'flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group',
              pathname === '/counsellor/new-leads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <div className="flex items-center gap-3">
              <Sparkles
                size={19}
                className={cn(
                  'transition-colors',
                  pathname === '/counsellor/new-leads' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                )}
              />
              <span>New Leads Pool</span>
            </div>
            <span className="text-[11px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
              Pool
            </span>
          </Link>
        </nav>

        {/* Profile Navigation (Sign out moved inside profile) */}
        <div className="p-4 border-t border-slate-100">
          <Link
            href="/counsellor/profile"
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border",
              pathname === '/counsellor/profile'
                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                : "text-slate-700 hover:bg-slate-50 border-slate-200/80"
            )}
          >
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-500" />
              <span>My Profile & Settings</span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </Link>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE TOP APP BAR (< lg)                                 */}
      {/* ========================================================= */}
      <header className="lg:hidden sticky top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Headphones size={18} />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm leading-none flex items-center gap-1.5">
              <span>{getPageTitle()}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>{employee?.name?.split(' ')[0] || 'Counsellor'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/counsellor/new-leads"
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all',
              pathname === '/counsellor/new-leads'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            )}
          >
            <Sparkles size={13} />
            <span>New Leads</span>
          </Link>
          <Link
            href="/counsellor/profile"
            aria-label="My Profile"
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl font-bold text-xs transition-all shadow-2xs border",
              pathname === '/counsellor/profile'
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            )}
          >
            {getInitials(employee?.name)}
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                         */}
      {/* ========================================================= */}
      <main className="flex-1 lg:pl-72 w-full max-w-full overflow-x-hidden pb-24 lg:pb-8 pt-2 lg:pt-6">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 w-full">
          {children}
        </div>
      </main>

      {/* ========================================================= */}
      {/* MOBILE STICKY BOTTOM NAVIGATION (< lg)                    */}
      {/* ========================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 py-1.5 safe-bottom"
      >
        <div className="grid grid-cols-4 items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/counsellor/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center py-2 rounded-xl transition-all select-none min-h-[48px]',
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-full transition-all relative',
                    isActive ? 'bg-blue-50 text-blue-600 scale-105' : 'text-slate-400'
                  )}
                >
                  <Icon size={20} className={cn(isActive && 'stroke-[2.3]')} />
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white',
                        item.id === 'follow-ups' && overdueCount > 0 ? 'bg-rose-500' : 'bg-blue-600'
                      )}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold mt-0.5 tracking-tight',
                    isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
