'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  getCallOutcomesByEmployee,
  getLeadsByEmployee,
  getOverdueTasks,
  getTodaysCallCount,
  getTodaysTasks,
} from '@/lib/firestore';
import { getNextLead } from '@/lib/nextBestAction';
import { cn, formatDate, formatPhone } from '@/lib/utils';
import { Lead, CallOutcome } from '@/types';
import {
  Phone,
  PhoneCall,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock,
  Flame,
  Check,
  TrendingUp,
  RefreshCw,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CounsellorDashboard() {
  const { employee } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callsMade, setCallsMade] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [followUpsCount, setFollowUpsCount] = useState(0);
  const [todaysTasksCount, setTodaysTasksCount] = useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState(0);
  const [recentOutcomes, setRecentOutcomes] = useState<CallOutcome[]>([]);
  const [leadsMap, setLeadsMap] = useState<Record<string, Lead>>({});
  const [nextLead, setNextLead] = useState<Lead | null>(null);
  const [nextLeadReason, setNextLeadReason] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    if (!employee) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [todayTasks, overdue, calls, allAssigned, allOutcomes] = await Promise.all([
        getTodaysTasks(employee.id),
        getOverdueTasks(employee.id),
        getTodaysCallCount(employee.id),
        getLeadsByEmployee(employee.id),
        getCallOutcomesByEmployee(employee.id),
      ]);

      setTodaysTasksCount(todayTasks.length);
      setOverdueTasksCount(overdue.length);
      setCallsMade(calls);
      setNewLeadsCount(allAssigned.filter((lead) => lead.status === 'NEW').length);
      setFollowUpsCount(
        allAssigned.filter((lead) => !!lead.nextFollowUp && lead.status !== 'CONVERTED').length
      );

      const mapping: Record<string, Lead> = {};
      allAssigned.forEach((l) => {
        mapping[l.id] = l;
      });
      setLeadsMap(mapping);

      const recommendation = getNextLead(allAssigned);
      setNextLead(recommendation.lead as Lead | null);
      setNextLeadReason(recommendation.reason);

      setRecentOutcomes(allOutcomes.slice(0, 6));

      if (isManual) {
        toast.success('Dashboard metrics refreshed');
      }
    } catch (error) {
      console.error('Failed to load counsellor dashboard', error);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employee]);

  const totalAssignedWorkload = Object.keys(leadsMap).length;
  const callTarget = totalAssignedWorkload > 0 ? totalAssignedWorkload : (employee?.dailyCallTarget || 1);
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((callsMade / callTarget) * 100));
  }, [callTarget, callsMade]);

  const callsRemaining = Math.max(0, callTarget - callsMade);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const getReasonBadge = (reason: string | null) => {
    switch (reason) {
      case 'OVERDUE':
        return {
          label: 'Overdue Follow-up',
          icon: Flame,
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'FOLLOW_UP_TODAY':
        return {
          label: 'Scheduled Callback',
          icon: Calendar,
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'NEW':
        return {
          label: 'New High Priority',
          icon: Sparkles,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      default:
        return {
          label: 'Recommended Lead',
          icon: TrendingUp,
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
        };
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'INTERESTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CALL_LATER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CONVERTED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'NO_RESPONSE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NOT_INTERESTED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'WRONG_NUMBER':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-blue-600/20 border-t-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your telecalling workspace...</p>
      </div>
    );
  }

  const reasonConfig = getReasonBadge(nextLeadReason);
  const ReasonIcon = reasonConfig.icon;

  return (
    <div className="space-y-4 pb-6">
      {/* ========================================================= */}
      {/* 1. COMPACT WELCOME HEADER                                */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {todayFormatted}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            {greeting}, {employee?.name?.split(' ')[0] || 'Counsellor'}
          </h1>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          aria-label="Refresh data"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin text-blue-600' : ''} />
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. DAILY TARGET CARD                                     */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-5 text-white shadow-md shadow-blue-500/15">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-indigo-500/20 blur-lg pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                Daily Telecalling Target
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white">
              {progressPercent}% Complete
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {callsMade}
              </span>
              <span className="text-blue-200 text-base sm:text-lg font-medium ml-1">
                / {callTarget} calls
              </span>
            </div>
            <div className="text-right">
              {callsRemaining === 0 ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                  <Award size={14} /> Goal Achieved!
                </div>
              ) : (
                <div className="text-xs text-blue-100">
                  <span className="font-bold text-white text-sm">{callsRemaining}</span> calls remaining
                </div>
              )}
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="h-2.5 w-full bg-blue-900/40 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-700 ease-out shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. NEXT BEST ACTION (HERO CARD - TOP PROMINENCE)         */}
      {/* ========================================================= */}
      <div className="rounded-2xl border-2 border-blue-200/90 bg-white p-5 shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <PhoneCall size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Next Recommended Call
              </h2>
              <p className="text-[11px] text-slate-400">Calculated by priority algorithm</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${reasonConfig.classes}`}
          >
            <ReasonIcon size={12} />
            {reasonConfig.label}
          </span>
        </div>

        {nextLead ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {nextLead.name}
                  </h3>
                  <p className="text-sm font-semibold text-blue-600 mt-0.5">
                    {formatPhone(nextLead.mobile)}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    nextLead.priority === 'HIGH'
                      ? 'bg-rose-100 text-rose-700'
                      : nextLead.priority === 'LOW'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {nextLead.priority || 'MEDIUM'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Interested Course</span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {nextLead.course || 'General Admissions'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">District / Location</span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {nextLead.location || nextLead.district || 'Salem Region'}
                  </span>
                </div>
              </div>

              {nextLead.notes && (
                <div className="pt-2 border-t border-slate-200/60 text-xs">
                  <span className="text-slate-400 block font-medium">Previous Context</span>
                  <p className="text-slate-600 line-clamp-1 italic mt-0.5">&ldquo;{nextLead.notes}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Prominent Direct Call Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/counsellor/workspace"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all min-h-[48px]"
              >
                <Phone size={18} />
                <span>Start Calling Lead</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/counsellor/todays-calls"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm active:scale-[0.98] transition-all min-h-[48px]"
              >
                <Calendar size={16} />
                <span>View Full Schedule</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You have no pending overdue calls or today&apos;s callbacks. New leads will appear here as they are assigned.
            </p>
            <Link
              href="/counsellor/new-leads"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline pt-2"
            >
              Browse New Leads Pool <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. QUICK STATISTICS GRID                                 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/counsellor/todays-calls"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Calls Today
            </span>
            <Phone size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{callsMade}</span>
            <span className="text-[11px] text-slate-400">logged</span>
          </div>
        </Link>

        <Link
          href="/counsellor/new-leads"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              New Leads
            </span>
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{newLeadsCount}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">uncontacted</span>
          </div>
        </Link>

        <Link
          href="/counsellor/follow-ups"
          className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Follow-ups
            </span>
            <Calendar size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{followUpsCount}</span>
            <span className="text-[11px] text-slate-400">pending</span>
          </div>
        </Link>

        <Link
          href="/counsellor/follow-ups"
          className={cn(
            'p-3.5 rounded-xl border shadow-2xs transition-all flex flex-col justify-between',
            overdueTasksCount > 0
              ? 'bg-rose-50/70 border-rose-200/80 hover:border-rose-300'
              : 'bg-white border-slate-200/90 hover:border-blue-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                overdueTasksCount > 0 ? 'text-rose-700' : 'text-slate-500'
              )}
            >
              Overdue
            </span>
            <AlertTriangle
              size={16}
              className={overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-400'}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={cn(
                'text-2xl font-black',
                overdueTasksCount > 0 ? 'text-rose-700' : 'text-slate-900'
              )}
            >
              {overdueTasksCount}
            </span>
            <span
              className={cn(
                'text-[11px] font-semibold',
                overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-400'
              )}
            >
              {overdueTasksCount > 0 ? 'needs attention' : 'on track'}
            </span>
          </div>
        </Link>
      </div>

      {/* ========================================================= */}
      {/* 5. RECENT ACTIVITY LIST                                  */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Recent Call Activity
            </h3>
          </div>
          <span className="text-xs text-slate-400">Latest dispositions</span>
        </div>

        {recentOutcomes.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No calls logged yet today. Complete your first call to see activity here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOutcomes.map((outcome) => {
              const matchedLead = leadsMap[outcome.leadId];
              const leadName = matchedLead?.name || 'Student Lead';
              const outcomeDate = outcome.createdAt?.toDate
                ? outcome.createdAt.toDate()
                : new Date();

              return (
                <div
                  key={outcome.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{leadName}</div>
                    <div className="text-slate-400 text-[11px] truncate flex items-center gap-2 mt-0.5">
                      <span>{formatDate(outcomeDate, 'h:mm a')}</span>
                      <span>•</span>
                      <span>Duration: {formatDuration(outcome.callDuration)}</span>
                      {outcome.notes && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-[140px]">&ldquo;{outcome.notes}&rdquo;</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${getOutcomeBadge(
                      outcome.outcome ?? ''
                    )}`}
                  >
                    {(outcome.outcome ?? '').replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
