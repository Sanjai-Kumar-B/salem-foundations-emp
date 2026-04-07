'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, LoadingSpinner, Table } from '@/components/ui';
import {
    getAllLeads,
    getAllEmployees,
    assignLeadsToEmployee,
} from '@/lib/firestore';
import { Lead, Employee } from '@/types';
import { Users, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssignmentsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [leadData, empData] = await Promise.all([
                getAllLeads(),
                getAllEmployees(true),
            ]);
            setLeads(leadData);
            setEmployees(empData.filter((e) => e.role === 'COUNSELLOR'));
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate workload per employee
    const getEmployeeWorkload = (employeeId: string) => {
        return leads.filter((l) => l.assignedEmployeeId === employeeId).length;
    };

    // Get unassigned leads count
    const unassignedBulk = leads.filter((l) => !l.assignedEmployeeId && l.source === 'BULK').length;
    const unassignedApp = leads.filter((l) => !l.assignedEmployeeId && l.source === 'APPLICATION').length;

    // Auto-assign logic
    const handleAutoAssign = async (source: 'BULK' | 'APPLICATION') => {
        const unassigned = leads.filter((l) => !l.assignedEmployeeId && l.source === source);
        if (unassigned.length === 0) {
            toast.error(`No unassigned ${source.toLowerCase()} leads`);
            return;
        }

        if (employees.length === 0) {
            toast.error('No active counsellors available');
            return;
        }

        // Round-robin assignment
        const assignments: { leadId: string; employeeId: string }[] = [];
        unassigned.forEach((lead, index) => {
            const employeeIndex = index % employees.length;
            assignments.push({
                leadId: lead.id,
                employeeId: employees[employeeIndex].id,
            });
        });

        // Group by employee
        const grouped = assignments.reduce((acc, curr) => {
            if (!acc[curr.employeeId]) acc[curr.employeeId] = [];
            acc[curr.employeeId].push(curr.leadId);
            return acc;
        }, {} as Record<string, string[]>);

        try {
            for (const [employeeId, leadIds] of Object.entries(grouped)) {
                await assignLeadsToEmployee(leadIds, employeeId);
            }
            toast.success(`Auto-assigned ${unassigned.length} leads`);
            loadData();
        } catch (error) {
            console.error('Auto-assign error:', error);
            toast.error('Failed to auto-assign');
        }
    };

    const employeeColumns = [
        { key: 'name', header: 'Counsellor' },
        { key: 'email', header: 'Email' },
        {
            key: 'dailyCallTarget',
            header: 'Daily Target',
            render: (emp: Employee) => `${emp.dailyCallTarget} calls`,
        },
        {
            key: 'workload',
            header: 'Assigned Leads',
            render: (emp: Employee) => {
                const count = getEmployeeWorkload(emp.id);
                return (
                    <Badge variant={count > 50 ? 'warning' : count > 0 ? 'success' : 'default'}>
                        {count}
                    </Badge>
                );
            },
        },
        {
            key: 'status',
            header: 'Status',
            render: (emp: Employee) => (
                <Badge variant={emp.isActive ? 'success' : 'danger'} size="sm">
                    {emp.isActive ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Work Assignments</h1>
                <p className="text-gray-500">Manage lead assignments and workload</p>
            </div>

            {/* Unassigned Leads Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <UserPlus className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Unassigned Bulk Leads</p>
                                <p className="text-xl font-bold text-gray-900">{unassignedBulk}</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => handleAutoAssign('BULK')}
                            disabled={unassignedBulk === 0}
                        >
                            Auto-Assign
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Pipeline A: Cold leads for qualification
                    </p>
                </Card>

                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Unassigned Application Leads</p>
                                <p className="text-xl font-bold text-gray-900">{unassignedApp}</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => handleAutoAssign('APPLICATION')}
                            disabled={unassignedApp === 0}
                        >
                            Auto-Assign
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Pipeline B: Warm leads for follow-up
                    </p>
                </Card>
            </div>

            {/* Counsellor Workload */}
            <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Counsellor Workload</h2>
                </div>
                <Table
                    columns={employeeColumns}
                    data={employees}
                    keyField="id"
                    emptyMessage="No counsellors available"
                />
            </Card>
        </div>
    );
}
