'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Card,
    Button,
    Table,
    Badge,
    Modal,
    Select,
    LoadingSpinner,
} from '@/components/ui';
import {
    getAllLeads,
    getAllEmployees,
    importLeads,
    assignLeadsToEmployee,
} from '@/lib/firestore';
import { Lead, Employee, LeadImportData } from '@/types';
import { formatDate, formatPhone, getPriorityColor, getStageColor } from '@/lib/utils';
import { Upload, UserPlus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BULK' | 'APPLICATION'>('ALL');
    const [stageFilter, setStageFilter] = useState('ALL');
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());

                const nameIndex = headers.findIndex((h) => h.includes('name'));
                const mobileIndex = headers.findIndex((h) => h.includes('mobile') || h.includes('phone'));
                const emailIndex = headers.findIndex((h) => h.includes('email'));
                const courseIndex = headers.findIndex((h) => h.includes('course'));
                const locationIndex = headers.findIndex((h) => h.includes('location') || h.includes('city'));

                if (nameIndex === -1 || mobileIndex === -1) {
                    throw new Error('CSV must have Name and Mobile/Phone columns');
                }

                const importData: LeadImportData[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
                    if (!values[mobileIndex]) continue;

                    importData.push({
                        name: values[nameIndex] || 'Unknown',
                        mobile: values[mobileIndex],
                        email: emailIndex !== -1 ? values[emailIndex] : undefined,
                        course: courseIndex !== -1 ? values[courseIndex] : undefined,
                        location: locationIndex !== -1 ? values[locationIndex] : undefined,
                    });
                }

                const result = await importLeads(importData, true);
                toast.success(`Imported ${result.imported} leads (${result.duplicates} duplicates skipped)`);
                setIsImportModalOpen(false);
                loadData();
            } catch (error) {
                console.error('Import error:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to import CSV');
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file);
    };

    const handleAssign = async () => {
        if (!selectedEmployeeId || selectedLeads.size === 0) return;

        try {
            await assignLeadsToEmployee(Array.from(selectedLeads), selectedEmployeeId);
            toast.success(`Assigned ${selectedLeads.size} leads`);
            setSelectedLeads(new Set());
            setIsAssignModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Assignment error:', error);
            toast.error('Failed to assign leads');
        }
    };

    const toggleSelectAll = () => {
        if (selectedLeads.size === filteredLeads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedLeads);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedLeads(newSelected);
    };

    // Filter leads
    const filteredLeads = leads.filter((lead) => {
        const matchesSearch =
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.mobile.includes(searchQuery);
        const matchesSource = sourceFilter === 'ALL' || lead.source === sourceFilter;
        const matchesStage = stageFilter === 'ALL' || lead.currentStage === stageFilter;
        return matchesSearch && matchesSource && matchesStage;
    });

    const columns = [
        {
            key: 'select',
            header: (
                <input
                    type="checkbox"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                />
            ),
            render: (lead: Lead) => (
                <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="rounded border-gray-300"
                />
            ),
        },
        { key: 'name', header: 'Name' },
        {
            key: 'mobile',
            header: 'Mobile',
            render: (lead: Lead) => formatPhone(lead.mobile),
        },
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
            key: 'priority',
            header: 'Priority',
            render: (lead: Lead) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(lead.priority)}`}>
                    {lead.priority}
                </span>
            ),
        },
        {
            key: 'currentStage',
            header: 'Stage',
            render: (lead: Lead) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.currentStage)}`}>
                    {lead.currentStage}
                </span>
            ),
        },
        {
            key: 'assignedEmployeeId',
            header: 'Assigned To',
            render: (lead: Lead) => {
                const emp = employees.find((e) => e.id === lead.assignedEmployeeId);
                return emp ? emp.name : <span className="text-gray-400">Unassigned</span>;
            },
        },
        {
            key: 'createdAt',
            header: 'Added',
            render: (lead: Lead) => formatDate(lead.createdAt, 'MMM d'),
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
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-gray-500">Manage and assign leads to counsellors</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                        <Upload size={18} className="mr-2" />
                        Import CSV
                    </Button>
                    {selectedLeads.size > 0 && (
                        <Button onClick={() => setIsAssignModalOpen(true)}>
                            <UserPlus size={18} className="mr-2" />
                            Assign ({selectedLeads.size})
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <Select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as 'ALL' | 'BULK' | 'APPLICATION')}
                        options={[
                            { value: 'ALL', label: 'All Sources' },
                            { value: 'BULK', label: 'Bulk Leads' },
                            { value: 'APPLICATION', label: 'Application' },
                        ]}
                        className="w-full sm:w-40"
                    />
                    <Select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        options={[
                            { value: 'ALL', label: 'All Stages' },
                            { value: 'NEW', label: 'New' },
                            { value: 'CONTACTED', label: 'Contacted' },
                            { value: 'QUALIFIED', label: 'Qualified' },
                            { value: 'UNQUALIFIED', label: 'Unqualified' },
                        ]}
                        className="w-full sm:w-40"
                    />
                </div>
            </Card>

            {/* Table */}
            <Card padding="none">
                <Table
                    columns={columns}
                    data={filteredLeads}
                    keyField="id"
                    emptyMessage="No leads found"
                />
            </Card>

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Import Leads from CSV"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Upload a CSV file with columns: <strong>Name</strong>, <strong>Mobile/Phone</strong> (required),
                        Email, Course, Location (optional)
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                        >
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-600">
                                {importing ? 'Importing...' : 'Click to select CSV file'}
                            </span>
                        </label>
                    </div>
                </div>
            </Modal>

            {/* Assign Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title={`Assign ${selectedLeads.size} Lead(s)`}
                size="sm"
            >
                <div className="space-y-4">
                    <Select
                        label="Assign to Counsellor"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        placeholder="Select counsellor"
                        options={employees.map((e) => ({ value: e.id, label: e.name }))}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAssign} disabled={!selectedEmployeeId}>
                            Assign
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
