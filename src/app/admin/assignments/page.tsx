'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  UserCheck,
  Scale,
  Search,
  Filter,
  CheckCircle2,
  ArrowRightLeft,
  History,
  RotateCcw,
  Check,
  AlertCircle,
  GraduationCap,
  MapPin,
  RefreshCw,
  User,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '@/components/ui';
import { assignLeadsToEmployee, getAllEmployees, getAllLeads } from '@/lib/firestore';
import { Employee, Lead } from '@/types';

function AssignmentsContent() {
  const searchParams = useSearchParams();
  const preselectedEmployeeId = searchParams?.get('employeeId') || '';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>(preselectedEmployeeId);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'UNASSIGNED' | 'HISTORY'>('UNASSIGNED');
  const [historyCounsellorFilter, setHistoryCounsellorFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLeads, allEmployees] = await Promise.all([
        getAllLeads(),
        getAllEmployees(true),
      ]);
      setLeads(allLeads);
      const counsellors = allEmployees.filter((employee) => employee.role === 'COUNSELLOR');
      setEmployees(counsellors);

      // If preselected was passed and exists, keep it
      if (preselectedEmployeeId && counsellors.some((c) => c.id === preselectedEmployeeId)) {
        setSelectedCounsellor(preselectedEmployeeId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load assignment data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute assigned and unassigned collections
  const unassignedLeads = useMemo(() => {
    return leads.filter((lead) => !lead.assignedEmployeeId);
  }, [leads]);

  const assignedLeads = useMemo(() => {
    return leads.filter((lead) => !!lead.assignedEmployeeId);
  }, [leads]);

  const assignedCount = assignedLeads.length;
  const unassignedCount = unassignedLeads.length;

  // Employee mapping dictionary for fast lookups
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Counsellor workload calculations with Team Average
  const { counsellorLoads, teamAverage, totalAssignedAll } = useMemo(() => {
    const loads = employees.map((employee) => {
      const assigned = leads.filter((lead) => lead.assignedEmployeeId === employee.id);
      const overdue = assigned.filter(
        (lead) => lead.nextFollowUp && lead.nextFollowUp.toDate().getTime() < Date.now()
      ).length;
      const conversion = assigned.length
        ? Math.round(
            (assigned.filter((lead) => lead.currentStage === 'CONVERTED').length / assigned.length) * 100
          )
        : 0;

      return {
        employee,
        totalAssigned: assigned.length,
        overdue,
        conversion,
      };
    });

    const total = loads.reduce((sum, item) => sum + item.totalAssigned, 0);
    const avg = employees.length > 0 ? Math.round(total / employees.length) : 0;

    return {
      counsellorLoads: loads,
      teamAverage: avg,
      totalAssignedAll: total,
    };
  }, [employees, leads]);

  // Filtered Unassigned Leads
  const filteredUnassigned = useMemo(() => {
    return unassignedLeads.filter((lead) => {
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.mobile.toLowerCase().includes(query) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.course && lead.course.toLowerCase().includes(query)) ||
        (lead.district && lead.district.toLowerCase().includes(query))
      );
    });
  }, [unassignedLeads, search]);

  // Filtered Assignment History Leads
  const filteredHistory = useMemo(() => {
    return assignedLeads.filter((lead) => {
      if (historyCounsellorFilter !== 'ALL' && lead.assignedEmployeeId !== historyCounsellorFilter) {
        return false;
      }
      if (!search) return true;
      const query = search.toLowerCase();
      const assignedEmp = lead.assignedEmployeeId ? employeeMap.get(lead.assignedEmployeeId) : null;
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.mobile.toLowerCase().includes(query) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.course && lead.course.toLowerCase().includes(query)) ||
        (lead.district && lead.district.toLowerCase().includes(query)) ||
        (assignedEmp && assignedEmp.name.toLowerCase().includes(query))
      );
    });
  }, [assignedLeads, search, historyCounsellorFilter, employeeMap]);

  // Active displayed list based on tab
  const currentDisplayedList = activeTab === 'UNASSIGNED' ? filteredUnassigned : filteredHistory;

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const currentIds = currentDisplayedList.map((l) => l.id);
    const allSelected = currentIds.every((id) => selectedLeads.includes(id));
    if (allSelected) {
      // Unselect only those currently displayed
      setSelectedLeads((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      // Add all currently displayed
      setSelectedLeads((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleTabChange = (tab: 'UNASSIGNED' | 'HISTORY') => {
    setActiveTab(tab);
    setSelectedLeads([]); // Clear selection when switching modes
  };

  const runAssignment = async () => {
    if (!selectedLeads.length) {
      toast.error('Please select at least one student lead.');
      return;
    }

    if (!selectedCounsellor) {
      toast.error('Please select one counsellor for assignment.');
      return;
    }

    const targetCounsellor = employeeMap.get(selectedCounsellor);
    const actionLabel = activeTab === 'HISTORY' ? 'Reassigned' : 'Assigned';

    setSubmitting(true);
    try {
      await assignLeadsToEmployee(selectedLeads, selectedCounsellor, 'MANUAL');
      toast.success(
        `${actionLabel} ${selectedLeads.length} lead(s) to ${targetCounsellor?.name || 'counsellor'}.`
      );
      setSelectedLeads([]);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assignment operation failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCounsellorObj = employeeMap.get(selectedCounsellor);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 relative pb-28">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  Leads Assignment
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-0.5">
                  Allocate new leads and reassign staff workloads balanced against team averages.
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={loadData}
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs font-semibold gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Metric Cards: First tab shows (assigned / unassigned), Selected leads tab removed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Assigned / Unassigned Format */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned / Unassigned Leads
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                ({assignedCount} / {unassignedCount})
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                {assignedCount} Assigned
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                {unassignedCount} Unassigned
              </span>
            </div>
          </Card>

          {/* Card 2: Active Counsellors */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Counsellors
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {employees.length}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Active staff available for lead allocation
            </p>
          </Card>

          {/* Card 3: Team Average Workload (Calculated by average lead assignment count) */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Team Average Workload
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {teamAverage}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase">leads / counsellor</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Benchmark calculated from {totalAssignedAll} total allocated leads
            </p>
          </Card>
        </div>

        {/* Main Work Area: Left = Student Selection & History Tabs, Right = Counsellor Workload Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Leads Table with Tabs */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-slate-200 bg-slate-50/70 p-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTabChange('UNASSIGNED')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === 'UNASSIGNED'
                        ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Unassigned Leads</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        activeTab === 'UNASSIGNED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {unassignedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabChange('HISTORY')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === 'HISTORY'
                        ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Assignment History & Reassign</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        activeTab === 'HISTORY'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {assignedCount}
                    </span>
                  </button>
                </div>

                {selectedLeads.length > 0 && (
                  <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg font-bold border border-blue-200/80">
                    <Check className="w-3.5 h-3.5" />
                    <span>{selectedLeads.length} student(s) selected</span>
                    <button
                      onClick={() => setSelectedLeads([])}
                      className="text-blue-500 hover:text-blue-900 ml-1 text-[11px] underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Filters Bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      activeTab === 'UNASSIGNED'
                        ? 'Search unassigned students by name, phone, course, district...'
                        : 'Search history by student, phone, counsellor name...'
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {activeTab === 'HISTORY' && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={historyCounsellorFilter}
                      onChange={(e) => setHistoryCounsellorFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">All Counsellors</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={
                            currentDisplayedList.length > 0 &&
                            currentDisplayedList.every((lead) => selectedLeads.includes(lead.id))
                          }
                          onChange={toggleAll}
                          disabled={currentDisplayedList.length === 0}
                        />
                      </th>
                      <th className="px-4 py-3">Student Lead</th>
                      <th className="px-4 py-3">Course / District</th>
                      {activeTab === 'HISTORY' ? (
                        <>
                          <th className="px-4 py-3">Currently Assigned To</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Quick Reassign</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3">Source & Priority</th>
                          <th className="px-4 py-3">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td className="px-4 py-12 text-slate-400 text-center" colSpan={6}>
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                            <span>Loading leads...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentDisplayedList.length === 0 ? (
                      <tr>
                        <td className="px-4 py-12 text-slate-500 text-center" colSpan={6}>
                          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <Users className="w-5 h-5" />
                            </div>
                            <p className="font-bold text-slate-700">
                              {activeTab === 'UNASSIGNED'
                                ? 'No unassigned leads found'
                                : 'No assigned leads found'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {search
                                ? 'No leads matched your search query. Try clearing filters.'
                                : activeTab === 'UNASSIGNED'
                                ? 'All leads are currently assigned to counsellors.'
                                : 'Assign leads to view assignment history and reassign.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentDisplayedList.map((lead) => {
                        const isSelected = selectedLeads.includes(lead.id);
                        const assignedEmp = lead.assignedEmployeeId
                          ? employeeMap.get(lead.assignedEmployeeId)
                          : null;

                        return (
                          <tr
                            key={lead.id}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/70 hover:bg-blue-50'
                                : 'hover:bg-slate-50/80'
                            }`}
                            onClick={() => toggleLead(lead.id)}
                          >
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={isSelected}
                                onChange={() => toggleLead(lead.id)}
                              />
                            </td>

                            {/* Lead details */}
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{lead.name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span>{lead.mobile}</span>
                                {lead.email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[140px]">{lead.email}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Course / District */}
                            <td className="px-4 py-3">
                              <div className="text-slate-800 font-medium">
                                {lead.course || '—'}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                {lead.district && (
                                  <>
                                    <MapPin className="w-3 h-3 text-slate-400 inline" />
                                    <span>{lead.district}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Tab specific columns */}
                            {activeTab === 'HISTORY' ? (
                              <>
                                <td className="px-4 py-3">
                                  {assignedEmp ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                                        {assignedEmp.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          {assignedEmp.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {assignedEmp.email}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Unassigned</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    className={`text-[10px] font-bold border-0 ${
                                      lead.status === 'INTERESTED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : lead.status === 'NOT_INTERESTED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {lead.status}
                                  </Badge>
                                </td>
                                <td
                                  className="px-4 py-3 text-right"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedLeads([lead.id]);
                                      toast('Select a new counsellor on the right to reassign.', {
                                        icon: '👉',
                                      });
                                    }}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Reassign
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-700 font-medium">
                                      {lead.source}
                                    </span>
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                        lead.priority === 'HIGH'
                                          ? 'bg-rose-100 text-rose-700'
                                          : lead.priority === 'LOW'
                                          ? 'bg-slate-100 text-slate-600'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {lead.priority}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className="bg-slate-100 text-slate-700 border-0 text-[10px] font-bold">
                                    {lead.status}
                                  </Badge>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer info */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                <span>
                  Showing {currentDisplayedList.length} of{' '}
                  {activeTab === 'UNASSIGNED' ? unassignedCount : assignedCount} leads
                </span>
                <span className="text-[11px] text-slate-400">
                  Multiple students can be selected for batch allocation
                </span>
              </div>
            </Card>
          </div>

          {/* Right Column: Counsellor Workload & Assignment Control */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    Counsellor Workload
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select exactly <span className="font-bold text-slate-800">ONE</span> counsellor to receive the selected leads.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Team Avg
                  </div>
                  <div className="text-sm font-black text-slate-800">
                    {teamAverage} leads
                  </div>
                </div>
              </div>

              {/* Counsellor Selection List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {counsellorLoads.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                    No active counsellors found in system.
                  </div>
                ) : (
                  counsellorLoads.map(({ employee, totalAssigned, overdue, conversion }) => {
                    const isSelected = selectedCounsellor === employee.id;
                    const diffFromAvg = totalAssigned - teamAverage;

                    // Workload categorization relative to team average
                    let workloadStatus: {
                      label: string;
                      color: string;
                      badgeBg: string;
                    };

                    if (teamAverage === 0) {
                      workloadStatus = {
                        label: 'Available',
                        color: 'text-emerald-700',
                        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      };
                    } else if (totalAssigned > teamAverage * 1.25 && diffFromAvg >= 2) {
                      workloadStatus = {
                        label: `Overloaded (+${diffFromAvg} vs avg)`,
                        color: 'text-rose-700',
                        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
                      };
                    } else if (totalAssigned < teamAverage * 0.75) {
                      workloadStatus = {
                        label: `Available (${Math.abs(diffFromAvg)} below avg)`,
                        color: 'text-emerald-700',
                        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      };
                    } else {
                      workloadStatus = {
                        label: 'Balanced (Optimal)',
                        color: 'text-blue-700',
                        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
                      };
                    }

                    // Workload bar percentage
                    const maxScale = Math.max(teamAverage * 1.6, 15);
                    const workloadPercent = Math.min(100, Math.round((totalAssigned / maxScale) * 100));

                    return (
                      <div
                        key={employee.id}
                        onClick={() => setSelectedCounsellor(employee.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Radio Check Indicator */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-5 h-5 rounded-full mt-0.5 border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span>{employee.name}</span>
                                {isSelected && (
                                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.2 rounded-full font-bold">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">{employee.email}</div>
                              {employee.department && (
                                <div className="text-[10px] text-slate-400">
                                  Dept: {employee.department}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Workload Status Badge */}
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${workloadStatus.badgeBg}`}
                          >
                            {workloadStatus.label}
                          </span>
                        </div>

                        {/* Workload Metric Bar */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-semibold text-slate-700">
                              Assigned Workload:{' '}
                              <span className="text-slate-900 font-black">
                                {totalAssigned} leads
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Avg: {teamAverage}
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                totalAssigned > teamAverage * 1.25 && diffFromAvg >= 2
                                  ? 'bg-rose-500'
                                  : totalAssigned < teamAverage * 0.75
                                  ? 'bg-emerald-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.max(6, workloadPercent)}%` }}
                            />
                          </div>

                          {/* Secondary stats */}
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Overdue Tasks: <b className="text-slate-700">{overdue}</b></span>
                            <span>Conversion: <b className="text-slate-700">{conversion}%</b></span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Banner & Submit Button */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                  <div className="text-slate-500 text-[11px]">Workflow Summary:</div>
                  <div className="font-semibold text-slate-800 mt-1 flex items-center justify-between">
                    <span>
                      Selected Students:{' '}
                      <b className="text-blue-700">{selectedLeads.length}</b>
                    </span>
                    <span>
                      Target Counsellor:{' '}
                      <b className="text-slate-900">
                        {selectedCounsellorObj ? selectedCounsellorObj.name : 'None selected'}
                      </b>
                    </span>
                  </div>
                </div>

                <Button
                  className={`w-full py-3.5 rounded-xl font-bold shadow-md transition-all text-sm flex items-center justify-center gap-2 ${
                    activeTab === 'HISTORY'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  onClick={runAssignment}
                  isLoading={submitting}
                  disabled={selectedLeads.length === 0 || !selectedCounsellor}
                >
                  {activeTab === 'HISTORY' ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Reassign {selectedLeads.length > 0 ? `${selectedLeads.length} ` : ''}
                      Leads to {selectedCounsellorObj?.name || 'Selected Counsellor'}
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      Assign {selectedLeads.length > 0 ? `${selectedLeads.length} ` : ''}
                      Leads to {selectedCounsellorObj?.name || 'Selected Counsellor'}
                    </>
                  )}
                </Button>

                {selectedLeads.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center">
                    Select one or more students from the table on the left to activate assignment.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>Loading Leads Assignment...</span>
          </div>
        </div>
      }
    >
      <AssignmentsContent />
    </Suspense>
  );
}