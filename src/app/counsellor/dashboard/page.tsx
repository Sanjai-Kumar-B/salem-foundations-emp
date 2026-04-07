'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, Badge, LoadingSpinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
    getTodaysTasks,
    getOverdueTasks,
    getTodaysCallCount,
    getLeadsByEmployee,
} from '@/lib/firestore';
import { Task } from '@/types';
import { getDueDateLabel } from '@/lib/utils';
import {
    Phone,
    CalendarCheck,
    AlertTriangle,
    Target,
    ArrowRight,
    Clock,
} from 'lucide-react';

export default function CounsellorDashboard() {
    const { employee } = useAuth();
    const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
    const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
    const [callsMade, setCallsMade] = useState(0);
    const [newLeadsCount, setNewLeadsCount] = useState(0);
    const [followUpsCount, setFollowUpsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employee) {
            loadData();
        }
    }, [employee]);

    const loadData = async () => {
        if (!employee) return;

        try {
            const [today, overdue, calls, bulkLeads, appLeads] = await Promise.all([
                getTodaysTasks(employee.id),
                getOverdueTasks(employee.id),
                getTodaysCallCount(employee.id),
                getLeadsByEmployee(employee.id, 'BULK'),
                getLeadsByEmployee(employee.id, 'FOLLOW_UP'),
            ]);

            setTodaysTasks(today);
            setOverdueTasks(overdue);
            setCallsMade(calls);
            setNewLeadsCount(bulkLeads.filter((l) => l.currentStage === 'NEW').length);
            setFollowUpsCount(appLeads.length);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const callTarget = employee?.dailyCallTarget || 30;
    const callProgress = Math.min((callsMade / callTarget) * 100, 100);

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Welcome, {employee?.name}</p>
            </div>

            {/* Call Progress */}
            <Card className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-500">Today&apos;s Call Target</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {callsMade} / {callTarget}
                        </p>
                    </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${callProgress}%` }}
                    />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    {callTarget - callsMade > 0
                        ? `${callTarget - callsMade} calls remaining`
                        : 'Target achieved! 🎉'}
                </p>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Link href="/counsellor/new-leads">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Phone className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">New Leads</p>
                                <p className="text-xl font-bold text-gray-900">{newLeadsCount}</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/counsellor/follow-ups">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <CalendarCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Follow-Ups</p>
                                <p className="text-xl font-bold text-gray-900">{followUpsCount}</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Overdue Alert */}
            {overdueTasks.length > 0 && (
                <Card className="mb-6 bg-red-50 border-red-200">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div className="flex-1">
                            <p className="font-medium text-red-800">
                                {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-red-600">Please complete these immediately</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Today's Tasks */}
            <Card padding="none">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Today&apos;s Tasks</h2>
                    <Badge variant="info" size="sm">{todaysTasks.length}</Badge>
                </div>

                {todaysTasks.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No tasks scheduled for today</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {todaysTasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                                <div
                                    className={`w-2 h-2 rounded-full ${task.status === 'COMPLETED'
                                        ? 'bg-green-500'
                                        : task.status === 'OVERDUE'
                                            ? 'bg-red-500'
                                            : 'bg-amber-500'
                                        }`}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{task.leadName}</p>
                                    <p className="text-sm text-gray-500">
                                        {task.taskType} • {getDueDateLabel(task.dueDate)}
                                    </p>
                                </div>
                                <Badge
                                    variant={task.pipeline === 'BULK' ? 'info' : 'success'}
                                    size="sm"
                                >
                                    {task.pipeline === 'BULK' ? 'New' : 'Follow-Up'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 gap-3">
                <Link
                    href="/counsellor/new-leads"
                    className="flex items-center justify-between p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5" />
                        <span className="font-medium">Start Calling New Leads</span>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                    href="/counsellor/follow-ups"
                    className="flex items-center justify-between p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <CalendarCheck className="w-5 h-5" />
                        <span className="font-medium">Check Follow-Ups</span>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
    );
}
