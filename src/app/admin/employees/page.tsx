'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Badge, Modal, Input, Select, LoadingSpinner } from '@/components/ui';
import { getAllEmployees, createEmployee, updateEmployee, deactivateEmployee } from '@/lib/firestore';
import { Employee, EmployeeFormData } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, Edit2, UserX, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<EmployeeFormData>({
        email: '',
        name: '',
        phone: '',
        role: 'COUNSELLOR',
        dailyCallTarget: 30,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await getAllEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Error loading employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                email: employee.email,
                name: employee.name,
                phone: employee.phone,
                role: employee.role,
                dailyCallTarget: employee.dailyCallTarget,
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                email: '',
                name: '',
                phone: '',
                role: 'COUNSELLOR',
                dailyCallTarget: 30,
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, formData);
                toast.success('Employee updated successfully');
            } else {
                await createEmployee({ ...formData, isActive: formData.isActive ?? true });
                toast.success('Employee created successfully');
            }
            setIsModalOpen(false);
            loadEmployees();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast.error('Failed to save employee');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (employee: Employee) => {
        if (!confirm(`Are you sure you want to deactivate ${employee.name}?`)) return;

        try {
            await deactivateEmployee(employee.id);
            toast.success('Employee deactivated');
            loadEmployees();
        } catch (error) {
            console.error('Error deactivating employee:', error);
            toast.error('Failed to deactivate employee');
        }
    };

    const filteredEmployees = employees.filter((emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        {
            key: 'role',
            header: 'Role',
            render: (emp: Employee) => (
                <Badge variant={emp.role === 'ADMIN' ? 'info' : 'default'} size="sm">
                    {emp.role}
                </Badge>
            ),
        },
        {
            key: 'dailyCallTarget',
            header: 'Daily Target',
            render: (emp: Employee) => `${emp.dailyCallTarget} calls`,
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (emp: Employee) => (
                <Badge variant={emp.isActive ? 'success' : 'danger'} size="sm">
                    {emp.isActive ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'lastLoginAt',
            header: 'Last Login',
            render: (emp: Employee) => emp.lastLoginAt ? formatDate(emp.lastLoginAt, 'MMM d, h:mm a') : '-',
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (emp: Employee) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal(emp)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                    >
                        <Edit2 size={16} />
                    </button>
                    {emp.isActive && (
                        <button
                            onClick={() => handleDeactivate(emp)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                        >
                            <UserX size={16} />
                        </button>
                    )}
                </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
                    <p className="text-gray-500">Manage counsellors and admins</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus size={18} className="mr-2" />
                    Add Employee
                </Button>
            </div>

            {/* Search */}
            <Card className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </Card>

            {/* Table */}
            <Card padding="none">
                <Table
                    columns={columns}
                    data={filteredEmployees}
                    keyField="id"
                    emptyMessage="No employees found"
                />
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
                size="md"
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={!!editingEmployee}
                    />
                    <Input
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />
                    <Select
                        label="Role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'COUNSELLOR' })}
                        options={[
                            { value: 'COUNSELLOR', label: 'Counsellor' },
                            { value: 'ADMIN', label: 'Admin' },
                        ]}
                    />
                    <Input
                        label="Daily Call Target"
                        type="number"
                        value={formData.dailyCallTarget}
                        onChange={(e) => setFormData({ ...formData, dailyCallTarget: parseInt(e.target.value) || 0 })}
                        min={0}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={saving}>
                            {editingEmployee ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
