'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
  Phone,
  Mail,
  Calendar,
  Building2,
  Briefcase,
  MapPin,
  CheckCircle2,
  PhoneCall,
  Flame,
  ArrowRight,
  Shield,
  Layers,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '@/components/ui';
import {
  createEmployee,
  updateEmployee,
  activateEmployee,
  deactivateEmployee,
  deleteEmployee,
  getAllEmployees,
  getAllLeads,
  getCallOutcomesByEmployee,
} from '@/lib/firestore';
import { Employee, Lead } from '@/types';
import { formatDate } from '@/lib/utils';

type CallLogItem = {
  id: string;
  outcome: string;
  duration: number;
  notes?: string;
  when: Date;
  connected: boolean;
};

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  rawEmployee: Employee;
  callsToday: number;
  target: number;
  connectRate: number;
  interested: number;
  conversions: number;
  pendingFollowUps: number;
  totalLeads: number;
  newLeads: number;
  durationTodayMinutes: number;
  avgDurationSeconds: number;
  workload: 'Healthy' | 'Balanced' | 'Overloaded';
  status: 'Active' | 'Offline';
  avatar: string;
  recentActivity: string;
  loginTime: string;
  recentCalls: CallLogItem[];
};

type NewEmployeeForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'ADMIN' | 'COUNSELLOR';
  dailyCallTarget: number;
  dob: string;
  joiningDate: string;
  department: string;
  designation: string;
  alternatePhone: string;
  city: string;
  address: string;
};

const INITIAL_FORM: NewEmployeeForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'COUNSELLOR',
  dailyCallTarget: 0,
  dob: '',
  joiningDate: '',
  department: 'Admissions & Telecalling',
  designation: 'Academic Counsellor',
  alternatePhone: '',
  city: 'Salem',
  address: '',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatLoginTime(employee: { lastLoginAt?: { toDate: () => Date } }): string {
  if (!employee.lastLoginAt) return 'Not logged in';
  return employee.lastLoginAt.toDate().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function EmployeesWorkforcePage() {
  const router = useRouter();

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<NewEmployeeForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [employees, leads] = await Promise.all([getAllEmployees(false), getAllLeads()]);
      const nextRows: EmployeeRow[] = [];

      for (const employee of employees) {
        const assignedLeads = leads.filter((lead: Lead) => lead.assignedEmployeeId === employee.id);

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const callsToday = await getCallOutcomesByEmployee(employee.id, start, end);
        const allCalls = await getCallOutcomesByEmployee(employee.id);

        const connectedCalls = allCalls.filter((call) => call.connected).length;
        const connectRate = allCalls.length ? Math.round((connectedCalls / allCalls.length) * 100) : 0;

        const durationTodaySeconds = callsToday.reduce((sum, c) => sum + (c.callDuration || 0), 0);
        const durationAllSeconds = allCalls.reduce((sum, c) => sum + (c.callDuration || 0), 0);
        const avgDurationSeconds = allCalls.length ? Math.round(durationAllSeconds / allCalls.length) : 0;

        const interested = assignedLeads.filter((lead) => lead.status === 'INTERESTED').length;
        const conversions = assignedLeads.filter((lead) => lead.status === 'CONVERTED').length;
        const newLeads = assignedLeads.filter((lead) => lead.status === 'NEW').length;
        const pendingFollowUps = assignedLeads.filter((lead) => {
          if (!lead.nextFollowUp) return false;
          return lead.nextFollowUp.toDate().getTime() >= Date.now();
        }).length;

        let workload: EmployeeRow['workload'] = 'Healthy';
        if (assignedLeads.length > 60) workload = 'Overloaded';
        else if (assignedLeads.length > 35) workload = 'Balanced';

        const sortedCalls = allCalls
          .slice()
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        const latestCall = sortedCalls[0];
        const recentActivity = latestCall
          ? `Last call: ${latestCall.notes || latestCall.nextAction || latestCall.outcome || 'Logged'}`
          : 'No recent activity';

        const recentCalls: CallLogItem[] = sortedCalls.slice(0, 5).map((call) => ({
          id: call.id,
          outcome: String(call.outcome || call.nextAction || 'FOLLOW_UP'),
          duration: call.callDuration || 0,
          notes: call.notes,
          when: call.createdAt?.toDate ? call.createdAt.toDate() : new Date(),
          connected: Boolean(call.connected),
        }));

        nextRows.push({
          id: employee.id,
          name: employee.name,
          role: employee.role,
          rawEmployee: employee,
          callsToday: callsToday.length,
          target: assignedLeads.length > 0 ? assignedLeads.length : (employee.dailyCallTarget || 0),
          connectRate,
          interested,
          conversions,
          pendingFollowUps,
          totalLeads: assignedLeads.length,
          newLeads,
          durationTodayMinutes: Math.round(durationTodaySeconds / 60),
          avgDurationSeconds,
          workload,
          status: employee.isActive ? 'Active' : 'Offline',
          avatar: getInitials(employee.name),
          recentActivity,
          loginTime: formatLoginTime(employee),
          recentCalls,
        });
      }

      nextRows.sort((a, b) => (a.status === 'Active' ? -1 : 1));
      setRows(nextRows);

      // Keep selectedEmp in sync if open
      if (selectedEmp) {
        const updatedSelected = nextRows.find((r) => r.id === selectedEmp.id);
        if (updatedSelected) setSelectedEmp(updatedSelected);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load employees';
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    return rows.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.rawEmployee.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.rawEmployee.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.rawEmployee.city || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (!activeFilter) return true;

      switch (activeFilter) {
        case 'Active':
          return emp.rawEmployee.isActive;
        case 'Inactive':
          return !emp.rawEmployee.isActive;
        case 'Overloaded':
          return emp.workload === 'Overloaded';
        case 'High Performers':
          return emp.connectRate >= 70;
        case 'Low Conversion':
          return emp.conversions === 0;
        default:
          return true;
      }
    });
  }, [rows, searchQuery, activeFilter]);

  const activeEmployees = rows.filter((row) => row.status === 'Active').length;
  const avgConnectRate = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.connectRate, 0) / rows.length)
    : 0;

  const topPerformer = rows
    .slice()
    .sort((a, b) => b.conversions - a.conversions || b.connectRate - a.connectRate)[0];

  const createNewEmployee = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('Please fill all required fields (Name, Email, Phone, Password).');
      return;
    }

    setSubmitting(true);
    try {
      await createEmployee({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        dailyCallTarget: form.dailyCallTarget,
        dob: form.dob || undefined,
        joiningDate: form.joiningDate || undefined,
        department: form.department || undefined,
        designation: form.designation || undefined,
        alternatePhone: form.alternatePhone || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
      });

      toast.success('Employee created successfully.');
      setShowCreateModal(false);
      setForm(INITIAL_FORM);
      await loadData(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create employee';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (employeeId: string, currentIsActive: boolean, employeeName: string) => {
    try {
      if (currentIsActive) {
        await deactivateEmployee(employeeId);
        toast.success(`${employeeName} has been deactivated.`);
      } else {
        await activateEmployee(employeeId);
        toast.success(`${employeeName} has been activated!`);
      }
      await loadData(true);
    } catch (error) {
      toast.error('Failed to update employee status');
    }
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently remove ${employeeName}? Any student leads currently assigned to them will be returned to the unassigned queue.`
      )
    ) {
      return;
    }

    try {
      await deleteEmployee(employeeId);
      toast.success(`${employeeName} removed successfully.`);
      if (selectedEmp?.id === employeeId) {
        setSelectedEmp(null);
      }
      await loadData(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove employee';
      toast.error(message);
    }
  };

  const getStatusBadge = (status: EmployeeRow['status']) => {
    if (status === 'Active') {
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">● Active</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-500 border border-slate-200">● Inactive</Badge>;
  };

  const getWorkloadBadge = (workload: EmployeeRow['workload']) => {
    if (workload === 'Healthy') {
      return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Healthy</span>;
    }
    if (workload === 'Balanced') {
      return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Balanced</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Overloaded</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 relative">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Employee List</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Comprehensive staff directory, performance analytics, and lead workload.
            </p>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-2xs border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={() => loadData(true)}
            >
              <RefreshCw className={`w-4 h-4 min-w-[16px] mr-2 text-gray-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span className="truncate">Refresh</span>
            </Button>
            <Button
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-2xs border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={() => router.push('/admin/assignments')}
            >
              <UserPlus className="w-4 h-4 min-w-[16px] mr-2 text-gray-500" />
              <span className="truncate">Assign Leads</span>
            </Button>
            <Button
              className="col-span-2 md:col-span-1 w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 min-w-[16px] mr-2" />
              <span className="truncate">Add Employee</span>
            </Button>
          </div>
        </div>

        {/* Quick Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-1.5">Total Employees</h3>
            <div className="text-2xl font-black text-gray-900">{rows.length}</div>
            <p className="text-xs text-gray-400 mt-1">Registered staff members</p>
          </Card>
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-1.5">Currently Active</h3>
            <div className="text-2xl font-black text-emerald-600">{activeEmployees}</div>
            <p className="text-xs text-gray-400 mt-1">{rows.length - activeEmployees} offline / inactive</p>
          </Card>
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-1.5">Top Performer</h3>
            <div className="text-xl font-black text-gray-900 truncate">{topPerformer?.name || 'N/A'}</div>
            <p className="text-xs text-gray-400 mt-1">{topPerformer ? `${topPerformer.conversions} conversions` : 'No data'}</p>
          </Card>
          <Card className="rounded-2xl border border-gray-200/90 shadow-2xs bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-1.5">Team Avg Connect</h3>
            <div className="text-2xl font-black text-blue-600">{avgConnectRate}%</div>
            <p className="text-xs text-gray-400 mt-1">Across all completed calls</p>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl shadow-2xs border border-gray-200/90">
          <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 w-full md:w-96 border border-gray-200">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search by name, role, department, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => setActiveFilter(null)}
              variant="outline"
              className={`h-9 px-3 text-xs rounded-xl border-gray-200 whitespace-nowrap ${
                activeFilter === null ? 'bg-gray-100 text-gray-900 font-bold border-gray-300' : 'text-gray-600 bg-white hover:bg-gray-50'
              }`}
            >
              All Employees
            </Button>
            {['Active', 'Inactive', 'Overloaded', 'High Performers', 'Low Conversion'].map((filter) => (
              <span
                key={filter}
                onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
                className={`cursor-pointer border rounded-xl px-3 py-2 text-xs whitespace-nowrap font-semibold transition-all ${
                  activeFilter === filter ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'hover:bg-gray-100 bg-white text-gray-700 border-gray-200'
                }`}
              >
                {filter}
              </span>
            ))}
          </div>
        </div>

        {/* Main Employee Table */}
        <Card className="rounded-2xl border-0 shadow-2xs bg-white overflow-hidden" padding="none">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/90 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department / Role</th>
                  <th className="px-6 py-4">Today&apos;s Calls / Workload</th>
                  <th className="px-6 py-4 text-center">Connect Rate</th>
                  <th className="px-6 py-4 text-center">Interested / Conv.</th>
                  <th className="px-6 py-4 text-center">Pending F/U</th>
                  <th className="px-6 py-4">Workload</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t border-gray-100 divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading employee list...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No employees match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedEmp(emp)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                            {emp.avatar}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {emp.role === 'ADMIN' && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{emp.rawEmployee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-gray-800">
                          {emp.rawEmployee.designation || (emp.role === 'ADMIN' ? 'Administrator' : 'Academic Counsellor')}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {emp.rawEmployee.department || 'Admissions'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-[150px]">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="font-bold text-gray-900">
                              {emp.callsToday}{' '}
                              <span className="text-gray-400 font-normal">
                                {emp.totalLeads > 0 ? `/${emp.totalLeads} leads` : emp.target > 0 ? `/${emp.target}` : ''}
                              </span>
                            </span>
                            <span className="text-gray-500 font-medium text-[11px]">
                              {Math.min(100, Math.round((emp.callsToday / Math.max(emp.totalLeads || emp.target, 1)) * 100))}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.round((emp.callsToday / Math.max(emp.totalLeads || emp.target, 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-base text-gray-900">{emp.connectRate}%</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md" title="Interested Leads">
                            {emp.interested}
                          </span>
                          <span className="text-gray-300">/</span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md" title="Conversions">
                            {emp.conversions}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs bg-gray-100 text-gray-700">
                          {emp.pendingFollowUps}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getWorkloadBadge(emp.workload)}</td>
                      <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => router.push(`/admin/assignments?employeeId=${emp.id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            title="Assign Leads"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>

                          {/* Distinct Activate / Deactivate Action */}
                          {emp.rawEmployee.isActive ? (
                            <button
                              onClick={() => toggleStatus(emp.id, true, emp.name)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                              title="Deactivate Employee"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleStatus(emp.id, false, emp.name)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Activate Employee"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Activate
                            </button>
                          )}

                          {/* Remove Employee Action */}
                          <button
                            onClick={() => handleRemoveEmployee(emp.id, emp.name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                            title="Remove Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* DETAILED VIEW SLIDE-OVER DRAWER                           */}
      {/* ========================================================= */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedEmp(null)} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {selectedEmp.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEmp.name}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedEmp.rawEmployee.designation || selectedEmp.role} • {selectedEmp.rawEmployee.department || 'Admissions'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status and Role Badges */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Current Status:</span>
                  {getStatusBadge(selectedEmp.status)}
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedEmp.role}
                  </span>
                </div>
                {selectedEmp.rawEmployee.isActive ? (
                  <button
                    onClick={() => toggleStatus(selectedEmp.id, true, selectedEmp.name)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 flex items-center gap-1.5"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Deactivate Employee
                  </button>
                ) : (
                  <button
                    onClick={() => toggleStatus(selectedEmp.id, false, selectedEmp.name)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Activate Employee
                  </button>
                )}
              </div>

              {/* Call Target & Workload Progress Card */}
              <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Today&apos;s Calling Progress</h3>
                    <p className="text-xs text-slate-500">
                      Workload based ({selectedEmp.totalLeads} student leads currently assigned)
                    </p>
                  </div>
                  <span className="text-xl font-black text-blue-600">
                    {Math.min(
                      100,
                      Math.round(
                        (selectedEmp.callsToday /
                          Math.max(selectedEmp.totalLeads || selectedEmp.target, 1)) *
                          100
                      )
                    )}%
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-2xl font-black text-slate-900">
                    {selectedEmp.callsToday}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      / {selectedEmp.totalLeads > 0 ? `${selectedEmp.totalLeads} assigned workload` : `${selectedEmp.target} target`}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {selectedEmp.totalLeads > selectedEmp.callsToday
                      ? `${selectedEmp.totalLeads - selectedEmp.callsToday} remaining leads`
                      : 'Workload calls completed'}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selectedEmp.callsToday /
                            Math.max(selectedEmp.totalLeads || selectedEmp.target, 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </Card>

              {/* Key Operational Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Connect Rate</span>
                  </div>
                  <div className="text-2xl font-black text-blue-900">{selectedEmp.connectRate}%</div>
                  <p className="text-[11px] text-blue-600/80 mt-0.5">Calls connected with leads</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                    <Trophy className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Conversions</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-900">{selectedEmp.conversions}</div>
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">Admissions finalized</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Talk Time Today</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{selectedEmp.durationTodayMinutes}m</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Avg: {formatDuration(selectedEmp.avgDurationSeconds)}/call</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Leads</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{selectedEmp.totalLeads}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{selectedEmp.newLeads} uncontacted</p>
                </div>
              </div>

              {/* Personal & Employment Details */}
              <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Profile &amp; Employment Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Work Email</span>
                    <a href={`mailto:${selectedEmp.rawEmployee.email}`} className="font-semibold text-blue-600 hover:underline">
                      {selectedEmp.rawEmployee.email}
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Primary Phone</span>
                    <a href={`tel:${selectedEmp.rawEmployee.phone}`} className="font-semibold text-slate-800">
                      {selectedEmp.rawEmployee.phone}
                    </a>
                  </div>

                  {selectedEmp.rawEmployee.alternatePhone && (
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Alternate / WhatsApp</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.rawEmployee.alternatePhone}</span>
                    </div>
                  )}

                  {selectedEmp.rawEmployee.dob && (
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Date of Birth</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.rawEmployee.dob}</span>
                    </div>
                  )}

                  {selectedEmp.rawEmployee.joiningDate && (
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Joining Date</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.rawEmployee.joiningDate}</span>
                    </div>
                  )}

                  {selectedEmp.rawEmployee.department && (
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Department</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.rawEmployee.department}</span>
                    </div>
                  )}

                  {selectedEmp.rawEmployee.city && (
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Location / City</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.rawEmployee.city}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">First Login Today</span>
                    <span className="font-semibold text-slate-800">{selectedEmp.loginTime}</span>
                  </div>
                </div>

                {selectedEmp.rawEmployee.address && (
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 block mb-0.5 font-medium">Address</span>
                    <span className="text-slate-700">{selectedEmp.rawEmployee.address}</span>
                  </div>
                )}
              </Card>

              {/* Call History & Recent Activity Logs */}
              <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Recent Call Outcomes</h3>
                  <span className="text-[11px] text-slate-400">{selectedEmp.recentCalls.length} logged</span>
                </div>

                {selectedEmp.recentCalls.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No call outcomes logged yet for this employee.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedEmp.recentCalls.map((call) => (
                      <div key={call.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-white border text-slate-800">
                              {call.outcome.replace(/_/g, ' ')}
                            </span>
                            {call.duration > 0 && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                {formatDuration(call.duration)}
                              </span>
                            )}
                          </div>
                          {call.notes && (
                            <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{call.notes}&rdquo;</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {formatDate(call.when, 'MMM d, h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="w-full rounded-xl border-gray-200 text-gray-700 text-xs"
                onClick={() => setSelectedEmp(null)}
              >
                Close Drawer
              </Button>
              <Button
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 text-xs shadow-xs"
                onClick={() => router.push(`/admin/assignments?employeeId=${selectedEmp.id}`)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Assign Leads</span>
              </Button>
              <Button
                variant="danger"
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-1.5 text-xs shadow-xs"
                onClick={() => handleRemoveEmployee(selectedEmp.id, selectedEmp.name)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD EMPLOYEE MODAL (WITH DOB, JOINING DATE, ETC.)         */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add New Employee</h3>
                <p className="text-xs text-gray-500 mt-0.5">Register staff member with credentials and employment details</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Section 1: Account & Credentials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Account &amp; Role</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. Ramesh Kumar"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="ramesh@salemfoundations.org"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password *</label>
                    <input
                      type="password"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Role</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      value={form.role}
                      onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as 'ADMIN' | 'COUNSELLOR' }))}
                    >
                      <option value="COUNSELLOR">Counsellor (Telecalling Staff)</option>
                      <option value="ADMIN">Admin (Full Control)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Numbers */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone Number *</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate / WhatsApp Phone</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="Optional alternate number"
                      value={form.alternatePhone}
                      onChange={(e) => setForm((prev) => ({ ...prev, alternatePhone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Essential Dates & Targets */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Essential Dates &amp; Targets</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth (DOB)</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      value={form.dob}
                      onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      value={form.joiningDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, joiningDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Call Target (Workload Adaptive)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="Auto (shifts with assigned leads)"
                      value={form.dailyCallTarget || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          dailyCallTarget: Number(e.target.value || 0),
                        }))
                      }
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Shifts automatically with allocated student leads.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Department & Location */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Department &amp; Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. Admissions / Outreach"
                      value={form.department}
                      onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. Senior Counsellor"
                      value={form.designation}
                      onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / District</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="e.g. Salem"
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Address</label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      placeholder="Street, locality, pincode"
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createNewEmployee}
                isLoading={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-5"
              >
                Create Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
