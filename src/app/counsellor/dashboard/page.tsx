'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, LoadingSpinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getCallOutcomesByEmployee, getLeadsByEmployee, getOverdueTasks, getTodaysCallCount, getTodaysTasks } from '@/lib/firestore';
import { getNextLead } from '@/lib/nextBestAction';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, CalendarCheck, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CounsellorDashboard() {
  const { employee } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [callsMade, setCallsMade] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [followUpsCount, setFollowUpsCount] = useState(0);
  const [todaysTasksCount, setTodaysTasksCount] = useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [nextLeadName, setNextLeadName] = useState<string | null>(null);
  const [nextLeadReason, setNextLeadReason] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!employee) return;
      setLoading(true);
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
        setFollowUpsCount(allAssigned.filter((lead) => !!lead.nextFollowUp && lead.status !== 'CONVERTED').length);

        const recommendation = getNextLead(allAssigned);
        setNextLeadName(recommendation.lead?.name ?? null);
        setNextLeadReason(recommendation.reason ?? null);

        setRecentActivity(
          allOutcomes
            .slice(0, 5)
            .map((outcome) => `${outcome.nextAction} at ${formatDate(outcome.createdAt.toDate())}`)
        );
      } catch (error) {
        console.error('Failed to load counsellor dashboard', error);
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [employee]);

  const callTarget = employee?.dailyCallTarget || 25;
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((callsMade / callTarget) * 100));
  }, [callTarget, callsMade]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f7ff] p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Counsellor Dashboard</p>
          <h1 className="text-2xl font-bold text-slate-900">Hello, {employee?.name ?? 'Counsellor'}</h1>
          <p className="text-sm text-slate-600">
            {callsMade}/{callTarget} calls completed today ({progressPercent}%)
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Calls Today</p>
            <p className="text-2xl font-bold text-gray-900">{callsMade}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">New Leads</p>
            <p className="text-2xl font-bold text-gray-900">{newLeadsCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Follow-ups</p>
            <p className="text-2xl font-bold text-gray-900">{followUpsCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Overdue Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{overdueTasksCount}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Next Best Action</h2>
              {nextLeadReason && <Badge variant="info" size="sm">{nextLeadReason}</Badge>}
            </div>
            {nextLeadName ? (
              <>
                <p className="text-xl font-bold text-gray-900">{nextLeadName}</p>
                <p className="mt-1 text-sm text-gray-500">Recommended by live queue prioritization</p>
                <div className="mt-4 flex gap-3">
                  <Button onClick={() => router.push('/counsellor/workspace')}>
                    <Phone className="mr-2 h-4 w-4" /> Open Calling Workspace
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/counsellor/todays-calls')}>
                    View Queue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No active lead in queue.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Task Summary</h2>
            <div className="space-y-3 text-sm">
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-700"><CalendarCheck className="h-4 w-4 text-blue-600" /> Today&apos;s Tasks</span>
                <span className="font-semibold">{todaysTasksCount}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-700"><AlertTriangle className="h-4 w-4 text-amber-600" /> Overdue</span>
                <span className="font-semibold">{overdueTasksCount}</span>
              </p>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CheckCircle2 className="h-5 w-5 text-green-600" /> Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent call activity.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((item) => (
                <li key={item} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
