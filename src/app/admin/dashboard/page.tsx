'use client';

import React, { useEffect, useState } from 'react';
import { Card, StatCard, Badge, LoadingSpinner, Table } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getAllEmployees, getAllLeads } from '@/lib/firestore';
import { Employee, Lead } from '@/types';
import { formatDate } from '@/lib/utils';
import {
    Users,
    UserPlus,
    Phone,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';

export default function AdminDashboard() {
    const { employee } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [empData, leadData] = await Promise.all([
                getAllEmployees(true),
                getAllLeads(),
            ]);
            setEmployees(empData);
            setLeads(leadData);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const totalLeads = leads.length;
    const bulkLeads = leads.filter((l) => l.source === 'BULK').length;
    const applicationLeads = leads.filter((l) => l.source === 'APPLICATION').length;
    const qualifiedLeads = leads.filter((l) => l.currentStage === 'QUALIFIED').length;
    const unassignedLeads = leads.filter((l) => !l.assignedEmployeeId).length;
    const activeCounsellors = employees.filter((e) => e.role === 'COUNSELLOR' && e.isActive).length;

    // Recent leads for table
    const recentLeads = leads.slice(0, 5);

    const leadColumns = [
        { key: 'name', header: 'Name' },
        { key: 'mobile', header: 'Mobile' },
        {
            key: 'source',
            header: 'Source',
            render: (lead: Lead) => (
                <Badge variant={lead.source === 'BULK' ? 'info' : 'success'} size="sm">
                    {lead.source}
                </Badge>
            ),
        },
        {
            key: 'currentStage',
            header: 'Stage',
            render: (lead: Lead) => (
                <Badge
                    variant={
                        lead.currentStage === 'QUALIFIED' ? 'success' :
                            lead.currentStage === 'UNQUALIFIED' ? 'danger' : 'default'
                    }
                    size="sm"
                >
                    {lead.currentStage}
                </Badge>
            ),
        },
        {
            key: 'createdAt',
            header: 'Added',
            render: (lead: Lead) => formatDate(lead.createdAt, 'MMM d, yyyy'),
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
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Welcome back, {employee?.name}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Leads"
                    value={totalLeads}
                    icon={<UserPlus size={24} />}
                />
                <StatCard
                    title="Bulk Leads"
                    value={bulkLeads}
                    icon={<Phone size={24} />}
                />
                <StatCard
                    title="Application Leads"
                    value={applicationLeads}
                    icon={<TrendingUp size={24} />}
                />
                <StatCard
                    title="Active Counsellors"
                    value={activeCounsellors}
                    icon={<Users size={24} />}
                />
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="flex items-center gap-4 p-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Qualified</p>
                        <p className="text-xl font-bold text-gray-900">{qualifiedLeads}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Unassigned</p>
                        <p className="text-xl font-bold text-gray-900">{unassignedLeads}</p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Conversion Rate</p>
                        <p className="text-xl font-bold text-gray-900">
                            {totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </Card>
            </div>

            {/* Recent Leads Table */}
            <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
                </div>
                <Table
                    columns={leadColumns}
                    data={recentLeads}
                    keyField="id"
                    emptyMessage="No leads yet"
                />
            </Card>
        </div>
    );
}
