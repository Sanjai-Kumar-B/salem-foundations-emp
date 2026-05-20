'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '@/components/ui';
import { assignLeadsToEmployee, getAllEmployees, getAllLeads } from '@/lib/firestore';
import { Employee, Lead } from '@/types';

export default function AssignmentsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLeads, allEmployees] = await Promise.all([getAllLeads(), getAllEmployees(true)]);
      setLeads(allLeads);
      setEmployees(allEmployees.filter((employee) => employee.role === 'COUNSELLOR'));
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

  const unassigned = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.assignedEmployeeId) return false;
      if (!search) return true;
      const text = `${lead.name} ${lead.mobile} ${lead.email ?? ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [leads, search]);

  const counsellorLoads = useMemo(() => {
    return employees.map((employee) => {
      const assigned = leads.filter((lead) => lead.assignedEmployeeId === employee.id);
      const overdue = assigned.filter((lead) => lead.nextFollowUp && lead.nextFollowUp.toDate().getTime() < Date.now()).length;
      const conversion = assigned.length
        ? Math.round((assigned.filter((lead) => lead.status === 'CONVERTED').length / assigned.length) * 100)
        : 0;

      return {
        employee,
        totalAssigned: assigned.length,
        overdue,
        conversion,
      };
    });
  }, [employees, leads]);

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedLeads.length === unassigned.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(unassigned.map((lead) => lead.id));
    }
  };

  const runAssignment = async () => {
    if (!selectedLeads.length) {
      toast.error('Select leads to assign.');
      return;
    }

    if (!selectedCounsellor) {
      toast.error('Select a counsellor.');
      return;
    }

    setSubmitting(true);
    try {
      await assignLeadsToEmployee(selectedLeads, selectedCounsellor, 'MANUAL');
      toast.success(`Assigned ${selectedLeads.length} leads successfully.`);
      setSelectedLeads([]);
      setSelectedCounsellor('');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assignment failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 relative pb-24">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Assignment Center</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Distribute unassigned leads to counsellors by live workload.</p>
          </div>
          <Button onClick={loadData} variant="outline" className="rounded-xl bg-white shadow-sm border-gray-200 hover:bg-gray-50 text-gray-700">
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Unassigned Leads</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{unassigned.length}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Counsellors</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{employees.length}</div>
          </Card>
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Selected Leads</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{selectedLeads.length}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search unassigned leads"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <Button variant="outline" className="text-xs">
                  <Filter className="w-3 h-3 mr-1" /> Filter
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.length === unassigned.length && unassigned.length > 0}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="px-3 py-3">Lead</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Priority</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td className="px-3 py-6 text-gray-500 text-center" colSpan={5}>Loading leads...</td>
                      </tr>
                    ) : unassigned.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-gray-500 text-center" colSpan={5}>No unassigned leads available.</td>
                      </tr>
                    ) : (
                      unassigned.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleLead(lead.id)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-900">{lead.name}</div>
                            <div className="text-xs text-gray-500">{lead.mobile}</div>
                          </td>
                          <td className="px-3 py-3 text-gray-700">{lead.source}</td>
                          <td className="px-3 py-3 text-gray-700">{lead.priority}</td>
                          <td className="px-3 py-3">
                            <Badge className="bg-blue-50 text-blue-700 border-0">{lead.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Counsellor Workload</h2>
              <div className="space-y-3">
                {counsellorLoads.length === 0 ? (
                  <p className="text-sm text-gray-500">No active counsellors found.</p>
                ) : (
                  counsellorLoads.map(({ employee, totalAssigned, overdue, conversion }) => (
                    <button
                      key={employee.id}
                      onClick={() => setSelectedCounsellor(employee.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-colors ${
                        selectedCounsellor === employee.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                        </div>
                        {selectedCounsellor === employee.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 flex items-center gap-3">
                        <span>Assigned: {totalAssigned}</span>
                        <span>Overdue: {overdue}</span>
                        <span>Conv: {conversion}%</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <Button className="w-full mt-4" onClick={runAssignment} isLoading={submitting}>
                Assign Selected Leads
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
