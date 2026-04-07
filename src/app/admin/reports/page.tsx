'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, StatCard, Badge, LoadingSpinner, Table, Select } from '@/components/ui';
import {
    getAllEmployees,
    getEmployeeStats,
    getAllLeads,
} from '@/lib/firestore';
import { Employee, Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import {
    BarChart3,
    Phone,
    CheckCircle,
    TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmployeeReport {
    id: string;
    name: string;
    email: string;
    totalCalls: number;
    connectedCalls: number;
    qualifiedLeads: number;
    connectionRate: number;
    qualificationRate: number;
    lastLoginAt?: Date;
}

export default function ReportsPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reports, setReports] = useState<EmployeeReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const getDateRange = (): { start: Date; end: Date } => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        switch (dateRange) {
            case 'week':
                start.setDate(start.getDate() - 7);
                break;
            case 'month':
                start.setMonth(start.getMonth() - 1);
                break;
            default: // today
                break;
        }

        return { start, end };
    };

    const loadData = async () => {
        try {
            const [empData, leadData] = await Promise.all([
                getAllEmployees(true),
                getAllLeads(),
            ]);

            setEmployees(empData.filter((e) => e.role === 'COUNSELLOR'));
            setLeads(leadData);

            // Generate reports for each employee
            const { start, end } = getDateRange();
            const reportData: EmployeeReport[] = [];

            for (const emp of empData.filter((e) => e.role === 'COUNSELLOR')) {
                const stats = await getEmployeeStats(emp.id, start, end);
                reportData.push({
                    id: emp.id,
                    name: emp.name,
                    email: emp.email,
                    totalCalls: stats.totalCalls,
                    connectedCalls: stats.connectedCalls,
                    qualifiedLeads: stats.qualifiedLeads,
                    connectionRate: stats.totalCalls > 0
                        ? Math.round((stats.connectedCalls / stats.totalCalls) * 100)
                        : 0,
                    qualificationRate: stats.connectedCalls > 0
                        ? Math.round((stats.qualifiedLeads / stats.connectedCalls) * 100)
                        : 0,
                    lastLoginAt: emp.lastLoginAt?.toDate(),
                });
            }

            setReports(reportData);
        } catch (error) {
            console.error('Error loading reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totalCalls = reports.reduce((sum, r) => sum + r.totalCalls, 0);
    const totalConnected = reports.reduce((sum, r) => sum + r.connectedCalls, 0);
    const totalQualified = reports.reduce((sum, r) => sum + r.qualifiedLeads, 0);
    const avgConnectionRate = reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + r.connectionRate, 0) / reports.length)
        : 0;

    // Lead stage breakdown
    const stageBreakdown = {
        new: leads.filter((l) => l.currentStage === 'NEW').length,
        contacted: leads.filter((l) => l.currentStage === 'CONTACTED').length,
        qualified: leads.filter((l) => l.currentStage === 'QUALIFIED').length,
        unqualified: leads.filter((l) => l.currentStage === 'UNQUALIFIED').length,
        converted: leads.filter((l) => l.currentStage === 'CONVERTED').length,
    };

    const reportColumns = [
        { key: 'name', header: 'Counsellor' },
        {
            key: 'totalCalls',
            header: 'Total Calls',
            render: (r: EmployeeReport) => (
                <span className="font-medium">{r.totalCalls}</span>
            ),
        },
        {
            key: 'connectedCalls',
            header: 'Connected',
            render: (r: EmployeeReport) => (
                <span className="text-green-600 font-medium">{r.connectedCalls}</span>
            ),
        },
        {
            key: 'connectionRate',
            header: 'Connect Rate',
            render: (r: EmployeeReport) => (
                <Badge
                    variant={r.connectionRate >= 50 ? 'success' : r.connectionRate >= 30 ? 'warning' : 'danger'}
                    size="sm"
                >
                    {r.connectionRate}%
                </Badge>
            ),
        },
        {
            key: 'qualifiedLeads',
            header: 'Qualified',
            render: (r: EmployeeReport) => (
                <span className="text-blue-600 font-medium">{r.qualifiedLeads}</span>
            ),
        },
        {
            key: 'qualificationRate',
            header: 'Qual. Rate',
            render: (r: EmployeeReport) => (
                <Badge
                    variant={r.qualificationRate >= 30 ? 'success' : r.qualificationRate >= 15 ? 'warning' : 'danger'}
                    size="sm"
                >
                    {r.qualificationRate}%
                </Badge>
            ),
        },
        {
            key: 'lastLoginAt',
            header: 'Last Login',
            render: (r: EmployeeReport) =>
                r.lastLoginAt ? formatDate(r.lastLoginAt, 'MMM d, h:mm a') : '-',
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-500">Monitor counsellor performance</p>
                </div>
                <Select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    options={[
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'Last 7 Days' },
                        { value: 'month', label: 'Last 30 Days' },
                    ]}
                    className="w-40"
                />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Calls"
                    value={totalCalls}
                    icon={<Phone size={24} />}
                />
                <StatCard
                    title="Connected"
                    value={totalConnected}
                    icon={<CheckCircle size={24} />}
                />
                <StatCard
                    title="Qualified"
                    value={totalQualified}
                    icon={<TrendingUp size={24} />}
                />
                <StatCard
                    title="Avg. Connect Rate"
                    value={`${avgConnectionRate}%`}
                    icon={<BarChart3 size={24} />}
                />
            </div>

            {/* Lead Stage Breakdown */}
            <Card className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Lead Pipeline Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{stageBreakdown.new}</p>
                        <p className="text-sm text-blue-600">New</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{stageBreakdown.contacted}</p>
                        <p className="text-sm text-purple-600">Contacted</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{stageBreakdown.qualified}</p>
                        <p className="text-sm text-green-600">Qualified</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{stageBreakdown.unqualified}</p>
                        <p className="text-sm text-red-600">Unqualified</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">{stageBreakdown.converted}</p>
                        <p className="text-sm text-emerald-600">Converted</p>
                    </div>
                </div>
            </Card>

            {/* Counsellor Performance Table */}
            <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Counsellor Performance</h2>
                </div>
                <Table
                    columns={reportColumns}
                    data={reports}
                    keyField="id"
                    emptyMessage="No data available"
                />
            </Card>
        </div>
    );
}
