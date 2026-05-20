'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Card, LoadingSpinner, Select } from '@/components/ui';
import {
  getAllEmployees,
  getAllLeads,
  getEmployeePerformanceMetrics,
  getEmployeeStats,
} from '@/lib/firestore';
import { Employee, Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import { Activity, CheckCircle2, Phone, Target, Users } from 'lucide-react';
import toast from 'react-hot-toast';

type DateFilter = 'today' | 'yesterday' | 'week' | 'month';

type EmployeeMetricRow = {
  id: string;
  name: string;
  email: string;
  totalLeadsAssigned: number;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
  connectionRate: number;
  conversionRate: number;
  followUpsScheduled: number;
};

function getRange(dateFilter: DateFilter) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  if (dateFilter === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }
  if (dateFilter === 'week') start.setDate(start.getDate() - 7);
  if (dateFilter === 'month') start.setMonth(start.getMonth() - 1);

  return { start, end };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [rows, setRows] = useState<EmployeeMetricRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [allEmployees, allLeads] = await Promise.all([getAllEmployees(true), getAllLeads()]);
        const counsellors = allEmployees.filter((employee) => employee.role === 'COUNSELLOR');
        setEmployees(counsellors);
        setLeads(allLeads);

        const { start, end } = getRange(dateFilter);
        const computedRows = await Promise.all(
          counsellors.map(async (employee) => {
            const [stats, perf] = await Promise.all([
              getEmployeeStats(employee.id, start, end),
              getEmployeePerformanceMetrics(employee.id),
            ]);
            const connectionRate = stats.totalCalls ? Math.round((stats.connectedCalls / stats.totalCalls) * 100) : 0;
            return {
              id: employee.id,
              name: employee.name,
              email: employee.email,
              totalLeadsAssigned: perf.totalLeadsAssigned,
              totalCalls: stats.totalCalls,
              connectedCalls: stats.connectedCalls,
              conversions: perf.conversions,
              connectionRate,
              conversionRate: perf.conversionRate,
              followUpsScheduled: perf.followUpsScheduled,
            };
          })
        );

        setRows(computedRows.sort((a, b) => b.totalCalls - a.totalCalls));
      } catch (error) {
        console.error('Failed to load analytics', error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateFilter]);

  const totals = useMemo(() => {
    const totalCalls = rows.reduce((sum, row) => sum + row.totalCalls, 0);
    const connected = rows.reduce((sum, row) => sum + row.connectedCalls, 0);
    const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);
    const avgConnect = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.connectionRate, 0) / rows.length) : 0;
    return { totalCalls, connected, conversions, avgConnect };
  }, [rows]);

  const funnel = useMemo(() => {
    return {
      new: leads.filter((lead) => lead.status === 'NEW').length,
      contacted: leads.filter((lead) => lead.status === 'CONTACTED').length,
      interested: leads.filter((lead) => lead.status === 'INTERESTED').length,
      converted: leads.filter((lead) => lead.status === 'CONVERTED').length,
    };
  }, [leads]);

  const sourceMetrics = useMemo(() => {
    const grouped = new Map<string, { total: number; connected: number; converted: number }>();

    for (const source of ['APPLICATION', 'BULK'] as const) {
      grouped.set(source, { total: 0, connected: 0, converted: 0 });
    }

    leads.forEach((lead) => {
      const source = lead.source;
      const row = grouped.get(source) ?? { total: 0, connected: 0, converted: 0 };
      row.total += 1;
      if (lead.status !== 'NEW') row.connected += 1;
      if (lead.status === 'CONVERTED') row.converted += 1;
      grouped.set(source, row);
    });

    return Array.from(grouped.entries()).map(([source, value]) => ({
      source,
      total: value.total,
      connected: value.connected,
      converted: value.converted,
      conversionRate: value.total ? Math.round((value.converted / value.total) * 100) : 0,
    }));
  }, [leads]);

  const operationalInsights = useMemo(() => {
    const highestCalls = rows[0];
    const topConversion = rows.slice().sort((a, b) => b.conversionRate - a.conversionRate)[0];
    const overdueFollowUps = leads.filter((lead) => {
      if (!lead.nextFollowUp) return false;
      return lead.nextFollowUp.toDate().getTime() < Date.now() && lead.status !== 'CONVERTED';
    }).length;

    return [
      highestCalls ? `${highestCalls.name} has the highest call volume in selected period.` : 'No calls logged yet.',
      topConversion ? `${topConversion.name} has top conversion rate at ${topConversion.conversionRate}%.` : 'No conversion data yet.',
      `Overdue follow-ups currently in pipeline: ${overdueFollowUps}.`,
      `Active counsellors: ${employees.length}.`,
    ];
  }, [employees.length, leads, rows]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Live metrics from Firebase data ({formatDate(new Date())})</p>
          </div>
          <div className="w-full md:w-64">
            <Select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'week', label: 'Last 7 days' },
                { value: 'month', label: 'Last 30 days' },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Calls</p>
              <p className="text-xl font-semibold text-gray-900">{totals.totalCalls}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <Activity className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Connected</p>
              <p className="text-xl font-semibold text-gray-900">{totals.connected}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Conversions</p>
              <p className="text-xl font-semibold text-gray-900">{totals.conversions}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <Target className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Avg Connect Rate</p>
              <p className="text-xl font-semibold text-gray-900">{totals.avgConnect}%</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Funnel</h2>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span>New</span><span className="font-semibold">{funnel.new}</span></p>
              <p className="flex justify-between"><span>Contacted</span><span className="font-semibold">{funnel.contacted}</span></p>
              <p className="flex justify-between"><span>Interested</span><span className="font-semibold">{funnel.interested}</span></p>
              <p className="flex justify-between"><span>Converted</span><span className="font-semibold">{funnel.converted}</span></p>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Lead Source Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Connected</th>
                    <th className="px-3 py-2">Converted</th>
                    <th className="px-3 py-2">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sourceMetrics.map((source) => (
                    <tr key={source.source}>
                      <td className="px-3 py-2 font-medium text-gray-900">{source.source}</td>
                      <td className="px-3 py-2">{source.total}</td>
                      <td className="px-3 py-2">{source.connected}</td>
                      <td className="px-3 py-2">{source.converted}</td>
                      <td className="px-3 py-2">
                        <Badge variant={source.conversionRate >= 25 ? 'success' : source.conversionRate >= 10 ? 'warning' : 'default'} size="sm">
                          {source.conversionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Counsellor Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Assigned Leads</th>
                  <th className="px-3 py-2">Calls</th>
                  <th className="px-3 py-2">Connected</th>
                  <th className="px-3 py-2">Conv.</th>
                  <th className="px-3 py-2">Connect Rate</th>
                  <th className="px-3 py-2">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-2">{row.totalLeadsAssigned}</td>
                    <td className="px-3 py-2">{row.totalCalls}</td>
                    <td className="px-3 py-2">{row.connectedCalls}</td>
                    <td className="px-3 py-2">{row.conversions}</td>
                    <td className="px-3 py-2">{row.connectionRate}%</td>
                    <td className="px-3 py-2">{row.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Users className="h-5 w-5 text-blue-600" /> Operational Insights
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {operationalInsights.map((insight) => (
              <li key={insight} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                {insight}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
