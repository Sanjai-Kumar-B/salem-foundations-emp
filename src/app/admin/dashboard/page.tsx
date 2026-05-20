'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, LoadingSpinner } from '@/components/ui';
import {
  getAllEmployees,
  getAllLeads,
  getCallOutcomesByEmployee,
  getEmployeePerformanceMetrics,
  getTodaysCallCount,
} from '@/lib/firestore';
import { Employee, Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import { AlertCircle, BarChart, Clock, TrendingUp, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

type QueueRow = {
  id: string;
  leadName: string;
  assignedTo: string;
  issue: 'UNASSIGNED' | 'OVERDUE' | 'INTERESTED';
  priority: string;
};

type TeamRow = {
  id: string;
  name: string;
  callsToday: number;
  target: number;
  conversions: number;
  progress: number;
};

type ActivityRow = {
  id: string;
  employeeName: string;
  outcome: string;
  when: Date;
};

function timestampToDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate(): Date }).toDate();
  }
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamRows, setTeamRows] = useState<TeamRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allEmployees, allLeads] = await Promise.all([getAllEmployees(true), getAllLeads()]);
        const counsellors = allEmployees.filter((e) => e.role === 'COUNSELLOR');
        setEmployees(counsellors);
        setLeads(allLeads);

        const team = await Promise.all(
          counsellors.map(async (employee) => {
            const [callsToday, perf] = await Promise.all([
              getTodaysCallCount(employee.id),
              getEmployeePerformanceMetrics(employee.id),
            ]);
            const target = employee.dailyCallTarget || 25;
            const progress = Math.min(100, Math.round((callsToday / target) * 100));
            return {
              id: employee.id,
              name: employee.name,
              callsToday,
              target,
              conversions: perf.conversions,
              progress,
            };
          })
        );
        setTeamRows(team.sort((a, b) => b.callsToday - a.callsToday));

        const latest = await Promise.all(
          counsellors.map(async (employee) => {
            const outcomes = await getCallOutcomesByEmployee(employee.id);
            return outcomes.slice(0, 3).map((outcome) => ({
              id: `${employee.id}-${outcome.id}`,
              employeeName: employee.name,
              outcome: outcome.nextAction ?? 'FOLLOW_UP',
              when: timestampToDate(outcome.createdAt) ?? new Date(),
            }));
          })
        );
        setRecentActivity(
          latest
            .flat()
            .sort((a, b) => b.when.getTime() - a.when.getTime())
            .slice(0, 8)
        );
      } catch (error) {
        console.error('Failed to load admin dashboard', error);
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const metrics = useMemo(() => {
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const startMs = dayStart.getTime();

    const unassigned = leads.filter((lead) => !lead.assignedEmployeeId).length;
    const overdue = leads.filter((lead) => {
      if (!lead.nextFollowUp) return false;
      const nextAt = lead.nextFollowUp.toDate().getTime();
      return nextAt < now && lead.status !== 'CONVERTED' && lead.status !== 'NOT_INTERESTED';
    }).length;
    const newToday = leads.filter((lead) => lead.createdAt.toDate().getTime() >= startMs).length;
    const interested = leads.filter((lead) => lead.status === 'INTERESTED').length;

    return { unassigned, overdue, newToday, interested };
  }, [leads]);

  const queueRows = useMemo<QueueRow[]>(() => {
    const rows: QueueRow[] = [];

    leads.forEach((lead) => {
      const assigned = employees.find((employee) => employee.id === lead.assignedEmployeeId)?.name ?? 'Unassigned';

      if (!lead.assignedEmployeeId) {
        rows.push({
          id: `${lead.id}-u`,
          leadName: lead.name,
          assignedTo: assigned,
          issue: 'UNASSIGNED',
          priority: lead.priority,
        });
        return;
      }

      if (lead.nextFollowUp && lead.nextFollowUp.toDate().getTime() < Date.now() && lead.status !== 'CONVERTED') {
        rows.push({
          id: `${lead.id}-o`,
          leadName: lead.name,
          assignedTo: assigned,
          issue: 'OVERDUE',
          priority: lead.priority,
        });
        return;
      }

      if (lead.status === 'INTERESTED') {
        rows.push({
          id: `${lead.id}-i`,
          leadName: lead.name,
          assignedTo: assigned,
          issue: 'INTERESTED',
          priority: lead.priority,
        });
      }
    });

    return rows.slice(0, 10);
  }, [employees, leads]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mission Control</h1>
            <p className="text-sm text-gray-500">Live operational snapshot from Firebase data.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto">
            <Button variant="outline" onClick={() => router.push('/admin/leads')}>
              <UserPlus className="mr-2 h-4 w-4" /> Leads
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/assignments')}>
              <Users className="mr-2 h-4 w-4" /> Assign
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/employees')}>
              <Users className="mr-2 h-4 w-4" /> Staff
            </Button>
            <Button onClick={() => router.push('/admin/analytics')}>
              <BarChart className="mr-2 h-4 w-4" /> Analytics
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unassigned Leads</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.unassigned}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Overdue Follow-ups</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.overdue}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">New Leads Today</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.newToday}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Interested Leads</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.interested}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" padding="none">
            <div className="border-b border-gray-100 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Priority Work Queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Issue</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queueRows.length === 0 && (
                    <tr>
                      <td className="px-4 py-5 text-gray-500" colSpan={4}>
                        No urgent queue items.
                      </td>
                    </tr>
                  )}
                  {queueRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.leadName}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={row.issue === 'OVERDUE' ? 'danger' : row.issue === 'UNASSIGNED' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {row.issue}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.assignedTo}</td>
                      <td className="px-4 py-3 text-gray-700">{row.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Live Activity</h2>
              <div className="space-y-3">
                {recentActivity.length === 0 && <p className="text-sm text-gray-500">No recent call activity.</p>}
                {recentActivity.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{item.employeeName}</span> - {item.outcome}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(item.when)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Team Progress</h2>
              <div className="space-y-4">
                {teamRows.slice(0, 5).map((row) => (
                  <div key={row.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{row.name}</span>
                      <span className="text-gray-600">
                        {row.callsToday}/{row.target}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${row.progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Conversions today: {row.conversions}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Active Counsellors</p>
              <p className="text-lg font-semibold text-gray-900">{employees.length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Queue Pressure</p>
              <p className="text-lg font-semibold text-gray-900">{queueRows.length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Leads</p>
              <p className="text-lg font-semibold text-gray-900">{leads.length}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
