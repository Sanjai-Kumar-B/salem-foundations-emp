'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Target,
  Building,
  Calendar,
  MapPin,
  LogOut,
  CheckCircle2,
  PhoneCall,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Headphones,
  CheckSquare,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, LoadingSpinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  getLeadsByEmployee,
  getTodaysCallCount,
  getEmployeePerformanceMetrics,
} from '@/lib/firestore';

export default function CounsellorProfilePage() {
  const router = useRouter();
  const { employee, user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  // Performance stats
  const [stats, setStats] = useState({
    todayCalls: 0,
    totalAssigned: 0,
    conversions: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    if (!employee) return;
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const [todayCount, leads, perf] = await Promise.all([
          getTodaysCallCount(employee.id),
          getLeadsByEmployee(employee.id),
          getEmployeePerformanceMetrics(employee.id),
        ]);
        setStats({
          todayCalls: todayCount,
          totalAssigned: leads.length,
          conversions: perf.conversions,
          conversionRate: perf.conversionRate,
        });
      } catch (error) {
        console.error('Failed to load employee stats', error);
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, [employee]);

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out of your counsellor account?')) {
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out successfully.');
      router.push('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
      toast.error('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const dailyTarget = stats.totalAssigned > 0 ? stats.totalAssigned : (employee?.dailyCallTarget || 1);
  const progressPercent = Math.min(100, Math.round((stats.todayCalls / dailyTarget) * 100));

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-100/40 via-emerald-50/20 to-transparent rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                {getInitials(employee?.name)}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs"
                title="Status: Online & Active"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {employee?.name || 'Admissions Counsellor'}
                </h1>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                  Counsellor
                </Badge>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                Salem Foundations Admissions Telecalling Team
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {employee?.email || user?.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {employee?.phone || 'Mobile Not Set'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs shrink-0 w-full sm:w-auto">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Daily Target
            </div>
            <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-blue-600" />
              {dailyTarget} Calls / Day
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Completed Today: <b className="text-slate-900">{stats.todayCalls}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Calling Performance Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Calls Today
          </span>
          <div className="text-2xl font-black text-slate-900">
            {stats.todayCalls} <span className="text-xs text-slate-400 font-medium">/ {dailyTarget}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Leads
          </span>
          <div className="text-2xl font-black text-slate-900">{stats.totalAssigned}</div>
          <p className="text-[10px] text-slate-400 mt-1">Assigned in your queue</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Admissions
          </span>
          <div className="text-2xl font-black text-emerald-600">{stats.conversions}</div>
          <p className="text-[10px] text-slate-400 mt-1">Direct student conversions</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Conv. Ratio
          </span>
          <div className="text-2xl font-black text-indigo-600">{stats.conversionRate}%</div>
          <p className="text-[10px] text-slate-400 mt-1">Lead to admission rate</p>
        </Card>
      </div>

      {/* Personal Information & Staff Profile */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5 sm:p-6">
        <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <User className="w-4.5 h-4.5 text-blue-600" />
          Employee Profile Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Full Legal Name
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.name || 'Not Available'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Official Email
            </span>
            <span className="font-bold text-slate-900 text-sm truncate block">
              {employee?.email || user?.email || 'Not Available'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Primary Mobile Number
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.phone || 'Not Configured'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Alternate Phone Number
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.alternatePhone || 'None Registered'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Department
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.department || 'Student Admissions & Counselling'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Designation
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.designation || 'Admissions Telecounsellor'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Date of Birth (DOB)
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.dob ? employee.dob : 'Not Recorded'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Joining Date
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.joiningDate ? employee.joiningDate : 'Active Staff'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Residential Address & City
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {employee?.address ? `${employee.address}, ` : ''}
              {employee?.city || 'Salem, Tamil Nadu'}
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5 sm:p-6">
        <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
          <Headphones className="w-4.5 h-4.5 text-blue-600" />
          Counsellor Workstation Quick Access
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/counsellor/workspace"
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                Calling Workspace
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/counsellor/todays-calls"
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-xs text-slate-800 group-hover:text-indigo-700">
                Today&apos;s Schedule
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/counsellor/follow-ups"
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-xs text-slate-800 group-hover:text-amber-700">
                Follow-up Tasks
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </Card>

      {/* Sign Out Card (Moved inside Profile as requested) */}
      <Card className="rounded-2xl border-2 border-rose-200 bg-gradient-to-b from-rose-50/40 to-white shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-rose-950 text-base">Sign Out of Account</h3>
            <p className="text-xs text-rose-700/80 mt-0.5">
              Securely terminate your telecalling session on this device.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed bg-white/80 p-3 rounded-xl border border-rose-100">
          Your call targets and saved outcomes will remain safely recorded in the Salem Foundations database. You can sign back in anytime with your credentials.
        </p>

        <Button
          onClick={handleSignOut}
          isLoading={signingOut}
          className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 gap-2 transition-all active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Counsellor Account
        </Button>
      </Card>
    </div>
  );
}
