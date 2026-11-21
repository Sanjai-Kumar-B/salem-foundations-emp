'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Flame,
  Layers,
  Phone,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, LoadingSpinner } from '@/components/ui';
import {
  getAllEmployees,
  getAllLeads,
  getEmployeePerformanceMetrics,
  getEmployeeStats,
} from '@/lib/firestore';
import { Employee, Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import { generateAnalyticsPdf } from '@/lib/reportGenerator';

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

const DATE_TABS: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [rows, setRows] = useState<EmployeeMetricRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEmployees, allLeads] = await Promise.all([
        getAllEmployees(true),
        getAllLeads(),
      ]);
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
          const connectionRate = stats.totalCalls
            ? Math.round((stats.connectedCalls / stats.totalCalls) * 100)
            : 0;
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
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const totals = useMemo(() => {
    const totalCalls = rows.reduce((sum, row) => sum + row.totalCalls, 0);
    const connected = rows.reduce((sum, row) => sum + row.connectedCalls, 0);
    const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);
    const avgConnect = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.connectionRate, 0) / rows.length)
      : 0;
    return { totalCalls, connected, conversions, avgConnect };
  }, [rows]);

  const funnel = useMemo(() => {
    return {
      new: leads.filter((lead) => lead.status === 'NEW').length,
      contacted: leads.filter((lead) => lead.status === 'CONTACTED').length,
      interested: leads.filter((lead) => lead.status === 'INTERESTED').length,
      converted: leads.filter((lead) => lead.currentStage === 'CONVERTED').length,
    };
  }, [leads]);

  const sourceMetrics = useMemo(() => {
    const grouped = new Map<string, { total: number; connected: number; converted: number }>();

    for (const source of ['APPLICATION', 'BULK'] as const) {
      grouped.set(source, { total: 0, connected: 0, converted: 0 });
    }

    leads.forEach((lead) => {
      const source = lead.source || 'APPLICATION';
      const row = grouped.get(source) ?? { total: 0, connected: 0, converted: 0 };
      row.total += 1;
      if (lead.status !== 'NEW') row.connected += 1;
      if (lead.currentStage === 'CONVERTED') row.converted += 1;
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
      return (
        lead.nextFollowUp.toDate().getTime() < Date.now() && lead.currentStage !== 'CONVERTED'
      );
    }).length;

    const insights: string[] = [];

    if (highestCalls && highestCalls.totalCalls > 0) {
      insights.push(
        `${highestCalls.name} logged the highest calling activity with ${highestCalls.totalCalls} calls in the selected timeframe.`
      );
    } else {
      insights.push('Calling activity is currently being logged for the active cycle.');
    }

    if (topConversion && topConversion.conversions > 0) {
      insights.push(
        `${topConversion.name} leads conversion efficiency at ${topConversion.conversionRate}% (${topConversion.conversions} admissions).`
      );
    } else {
      insights.push('Admissions conversion tracking is ready across all active channels.');
    }

    insights.push(
      `Pending follow-ups needing immediate counsellor attention: ${overdueFollowUps}.`
    );
    insights.push(
      `Active counselling staff currently deployed: ${employees.length} counsellors.`
    );

    return insights;
  }, [employees.length, leads, rows]);

  // Handle PDF Report Download
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const toastId = toast.loading('Generating institutional PDF report with watermark...');
    try {
      const dateFilterObj = DATE_TABS.find((t) => t.id === dateFilter);
      await generateAnalyticsPdf({
        dateFilterLabel: dateFilterObj?.label || 'Today',
        generatedAt: formatDate(new Date()),
        totals: {
          totalCalls: totals.totalCalls,
          connected: totals.connected,
          conversions: totals.conversions,
          avgConnect: totals.avgConnect,
          activeCounsellors: employees.length,
          totalLeads: leads.length,
        },
        funnel,
        sources: sourceMetrics,
        staff: rows,
        insights: operationalInsights,
      });
      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Failed to generate report', error);
      toast.error('Failed to generate PDF report', { id: toastId });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-semibold text-slate-500 animate-pulse">
          Loading analytics & performance metrics...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 relative pb-28">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Analytics & Reports
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Institutional admissions performance, counsellor productivity, and funnel conversion tracking.
              </p>
            </div>
          </div>

          {/* Controls: Date Tabs, Refresh, Download Report */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Date Range Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/70">
              {DATE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDateFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateFilter === tab.id
                      ? 'bg-white text-blue-600 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              Refresh
            </Button>

            {/* Download Report Button */}
            <Button
              onClick={handleDownloadPdf}
              isLoading={downloadingPdf}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </Button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Calls */}
          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Calls Logged
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PhoneCall className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totals.totalCalls}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Calls placed across all counsellors
            </p>
          </Card>

          {/* Connected Calls */}
          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Connected Calls
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totals.connected}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Successful student connections
            </p>
          </Card>

          {/* Conversions */}
          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Admissions Converted
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totals.conversions}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Confirmed student admissions
            </p>
          </Card>

          {/* Avg Connect Rate */}
          <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5 hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Average Connect Rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Target className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totals.avgConnect}%
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Overall call efficiency ratio
            </p>
          </Card>
        </div>

        {/* Funnel & Lead Source Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Admissions Pipeline Funnel */}
          <Card className="lg:col-span-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                Admissions Pipeline Funnel
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {leads.length} Total Leads
              </span>
            </div>

            <div className="space-y-3.5">
              {[
                {
                  label: 'New Leads',
                  count: funnel.new,
                  color: 'bg-blue-500',
                  textColor: 'text-blue-700',
                  badgeBg: 'bg-blue-50',
                },
                {
                  label: 'Contacted',
                  count: funnel.contacted,
                  color: 'bg-indigo-500',
                  textColor: 'text-indigo-700',
                  badgeBg: 'bg-indigo-50',
                },
                {
                  label: 'Interested Prospects',
                  count: funnel.interested,
                  color: 'bg-amber-500',
                  textColor: 'text-amber-800',
                  badgeBg: 'bg-amber-50',
                },
                {
                  label: 'Converted Admissions',
                  count: funnel.converted,
                  color: 'bg-emerald-500',
                  textColor: 'text-emerald-700',
                  badgeBg: 'bg-emerald-50',
                },
              ].map((stage) => {
                const percent = leads.length
                  ? Math.round((stage.count / leads.length) * 100)
                  : 0;

                return (
                  <div key={stage.label} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{stage.count}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stage.badgeBg} ${stage.textColor}`}
                        >
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.color} transition-all duration-300`}
                        style={{ width: `${Math.max(4, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Lead Source Performance */}
          <Card className="lg:col-span-8 rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-blue-600" />
                Performance by Lead Source
              </h2>
              <span className="text-xs font-bold text-slate-400">Application vs Bulk</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Lead Source</th>
                    <th className="px-4 py-3">Total Allocated</th>
                    <th className="px-4 py-3">Connected Calls</th>
                    <th className="px-4 py-3">Admissions</th>
                    <th className="px-4 py-3">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sourceMetrics.map((source) => (
                    <tr key={source.source} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{source.source}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{source.total}</td>
                      <td className="px-4 py-3 text-slate-700">{source.connected}</td>
                      <td className="px-4 py-3 text-slate-700">{source.converted}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            source.conversionRate >= 25
                              ? 'success'
                              : source.conversionRate >= 10
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                          className="font-bold text-[11px]"
                        >
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

        {/* Counsellor Performance Breakdown */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5 text-blue-600" />
              Staff Productivity & Performance Breakdown
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {rows.length} Active Counsellors
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Counsellor</th>
                  <th className="px-4 py-3">Assigned Leads</th>
                  <th className="px-4 py-3">Calls Made</th>
                  <th className="px-4 py-3">Connected</th>
                  <th className="px-4 py-3">Conversions</th>
                  <th className="px-4 py-3">Connection Rate</th>
                  <th className="px-4 py-3">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                      No counsellor records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{row.name}</div>
                            <div className="text-[11px] text-slate-400">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {row.totalLeadsAssigned}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{row.totalCalls}</td>
                      <td className="px-4 py-3 text-slate-700">{row.connectedCalls}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{row.conversions}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                          {row.connectionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            row.conversionRate >= 20
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Strategic Performance Insights */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900 tracking-tight">
            <Sparkles className="h-4.5 w-4.5 text-blue-600" />
            Strategic Performance Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {operationalInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-medium text-slate-700 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
