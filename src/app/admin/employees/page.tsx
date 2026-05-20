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
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '@/components/ui';
import {
  createEmployee,
  deactivateEmployee,
  getAllEmployees,
  getAllLeads,
  getCallOutcomesByEmployee,
} from '@/lib/firestore';
import { Lead } from '@/types';

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  callsToday: number;
  target: number;
  connectRate: number;
  interested: number;
  conversions: number;
  pendingFollowUps: number;
  workload: 'Healthy' | 'Balanced' | 'Overloaded';
  status: 'Active' | 'Offline';
  avatar: string;
  recentActivity: string;
  loginTime: string;
};

type NewEmployeeForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'ADMIN' | 'COUNSELLOR';
  dailyCallTarget: number;
};

const INITIAL_FORM: NewEmployeeForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'COUNSELLOR',
  dailyCallTarget: 30,
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

        const interested = assignedLeads.filter((lead) => lead.status === 'INTERESTED').length;
        const conversions = assignedLeads.filter((lead) => lead.status === 'CONVERTED').length;
        const pendingFollowUps = assignedLeads.filter((lead) => {
          if (!lead.nextFollowUp) return false;
          return lead.nextFollowUp.toDate().getTime() >= Date.now();
        }).length;

        let workload: EmployeeRow['workload'] = 'Healthy';
        if (assignedLeads.length > 60) workload = 'Overloaded';
        else if (assignedLeads.length > 35) workload = 'Balanced';

        const latestCall = allCalls
          .slice()
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];

        const recentActivity = latestCall
          ? `Last call: ${latestCall.notes || latestCall.nextAction}`
          : 'No recent activity';

        nextRows.push({
          id: employee.id,
          name: employee.name,
          role: employee.role,
          callsToday: callsToday.length,
          target: employee.dailyCallTarget,
          connectRate,
          interested,
          conversions,
          pendingFollowUps,
          workload,
          status: employee.isActive ? 'Active' : 'Offline',
          avatar: getInitials(employee.name),
          recentActivity,
          loginTime: formatLoginTime(employee),
        });
      }

      nextRows.sort((a, b) => (a.status === 'Active' ? -1 : 1));
      setRows(nextRows);
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
        emp.role.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (!activeFilter) return true;

      switch (activeFilter) {
        case 'Active':
          return emp.status === 'Active';
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
      toast.error('Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await createEmployee({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
        dailyCallTarget: form.dailyCallTarget,
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

  const deactivate = async (employeeId: string, employeeName: string) => {
    try {
      await deactivateEmployee(employeeId);
      toast.success(`${employeeName} deactivated.`);
      await loadData(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate employee';
      toast.error(message);
    }
  };

  const getStatusBadge = (status: EmployeeRow['status']) => {
    if (status === 'Active') {
      return <Badge className="bg-green-100 text-green-700 border-0">● Active</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-500 border-0">● Offline</Badge>;
  };

  const getWorkloadBadge = (workload: EmployeeRow['workload']) => {
    if (workload === 'Healthy') {
      return <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700">Healthy</span>;
    }
    if (workload === 'Balanced') {
      return <span className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">Balanced</span>;
    }
    return <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700">Overloaded</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 relative">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Employees & Workforce</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Monitor counsellor productivity and manage team access.
            </p>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-sm border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={() => loadData(true)}
            >
              <RefreshCw className={`w-4 h-4 mt-0.5 min-w-[16px] mr-2 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="truncate">Refresh</span>
            </Button>
            <Button
              variant="outline"
              className="w-full md:w-auto rounded-xl bg-white shadow-sm border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={() => router.push('/admin/assignments')}
            >
              <UserPlus className="w-4 h-4 mt-0.5 min-w-[16px] mr-2 text-gray-500" />
              <span className="truncate">Assign Leads</span>
            </Button>
            <Button
              className="col-span-2 md:col-span-1 w-full md:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mt-0.5 min-w-[16px] mr-2" />
              <span className="truncate">Add Employee</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Total Employees</h3>
            <div className="text-2xl font-black text-gray-900">{rows.length}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Currently Active</h3>
            <div className="text-2xl font-black text-gray-900">{activeEmployees}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Top Performer</h3>
            <div className="text-xl font-black text-gray-900 truncate">{topPerformer?.name || 'N/A'}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Team Avg Connect</h3>
            <div className="text-2xl font-black text-gray-900">{avgConnectRate}%</div>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 w-full md:w-80 border border-gray-200">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => setActiveFilter(null)}
              variant="outline"
              className={`h-9 px-3 text-xs rounded-lg border-gray-200 whitespace-nowrap ${
                activeFilter === null ? 'bg-gray-100 text-gray-900 border-gray-300' : 'text-gray-600 bg-white hover:bg-gray-50'
              }`}
            >
              All Employees
            </Button>
            {['Active', 'Overloaded', 'High Performers', 'Low Conversion'].map((filter) => (
              <span
                key={filter}
                onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
                className={`cursor-pointer border rounded-lg px-3 py-1.5 text-xs whitespace-nowrap font-medium transition-colors ${
                  activeFilter === filter ? 'bg-blue-50 text-blue-700 border-blue-200' : 'hover:bg-gray-100 bg-white text-gray-700 border-gray-200'
                }`}
              >
                {filter}
              </span>
            ))}
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden" padding="none">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Target Progress</th>
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
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading employees...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No employees match the current filters.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedEmp(emp)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {emp.avatar}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-500">{emp.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-[140px]">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="font-bold text-gray-700">{emp.callsToday} / {emp.target}</span>
                            <span className="text-gray-500 font-medium">{Math.min(100, Math.round((emp.callsToday / Math.max(emp.target, 1)) * 100))}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${Math.min(100, Math.round((emp.callsToday / Math.max(emp.target, 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-base">{emp.connectRate}%</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="flex items-center text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{emp.interested}</span>
                          <span className="text-gray-300">/</span>
                          <span className="flex items-center text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{emp.conversions}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-gray-100 text-gray-700">
                          {emp.pendingFollowUps}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getWorkloadBadge(emp.workload)}</td>
                      <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push('/admin/assignments')}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                            title="Assign Leads"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deactivate(emp.id, emp.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Deactivate"
                          >
                            <UserMinus className="w-4 h-4" />
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

      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setSelectedEmp(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Workforce Detail</h2>
              <button onClick={() => setSelectedEmp(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl">
                  {selectedEmp.avatar}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedEmp.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-semibold text-gray-500">{selectedEmp.role}</span>
                    {getStatusBadge(selectedEmp.status)}
                  </div>
                </div>
              </div>

              <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-3xl font-black text-gray-900">{selectedEmp.callsToday}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">Calls completed out of {selectedEmp.target}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{Math.min(100, Math.round((selectedEmp.callsToday / Math.max(selectedEmp.target, 1)) * 100))}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mt-4">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, Math.round((selectedEmp.callsToday / Math.max(selectedEmp.target, 1)) * 100))}%` }}
                  />
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Connect Rate</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">{selectedEmp.connectRate}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <Trophy className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Conversions</span>
                  </div>
                  <div className="text-2xl font-black text-green-800">{selectedEmp.conversions}</div>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Interested</span>
                  </div>
                  <div className="text-2xl font-black text-blue-800">{selectedEmp.interested}</div>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Pending F/U</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">{selectedEmp.pendingFollowUps}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Clock className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">First Login</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{selectedEmp.loginTime}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                <p className="text-sm text-gray-700 font-medium">{selectedEmp.recentActivity}</p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full rounded-xl border-gray-200 text-gray-700" onClick={() => setSelectedEmp(null)}>
                Close
              </Button>
              <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push('/admin/assignments')}>
                Assign Leads
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Add Employee</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                type="password"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Temporary password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as 'ADMIN' | 'COUNSELLOR' }))}
              >
                <option value="COUNSELLOR">Counsellor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <input
                type="number"
                min={1}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Daily target"
                value={form.dailyCallTarget}
                onChange={(e) => setForm((prev) => ({ ...prev, dailyCallTarget: Number(e.target.value || 30) }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={createNewEmployee} isLoading={submitting}>
                Create Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
