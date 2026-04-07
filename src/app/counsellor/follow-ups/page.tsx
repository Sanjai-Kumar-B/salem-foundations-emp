'use client';

import React, { useEffect, useState } from 'react';
import { Card, Badge, LoadingSpinner, EmptyState, Button } from '@/components/ui';
import { CallOutcomeModal } from '@/components/counsellor/CallOutcomeModal';
import { useAuth } from '@/hooks/useAuth';
import { getLeadsByEmployee, recordCallOutcome, getTasksByEmployee } from '@/lib/firestore';
import { Lead, Task, CallOutcomeFormData } from '@/types';
import { formatPhone, getCallLink, getDueDateLabel, isOverdue } from '@/lib/utils';
import { Phone, MessageSquare, CalendarCheck, AlertTriangle, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FollowUpsPage() {
    const { employee } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);

    useEffect(() => {
        if (employee) {
            loadData();
        }
    }, [employee]);

    const loadData = async () => {
        if (!employee) return;
        try {
            const [leadData, taskData] = await Promise.all([
                getLeadsByEmployee(employee.id, 'FOLLOW_UP'),
                getTasksByEmployee(employee.id, 'PENDING'),
            ]);

            // Only show active leads (not closed)
            const activeLeads = leadData.filter((l) =>
                !['CONVERTED', 'CLOSED', 'UNQUALIFIED'].includes(l.currentStage)
            );

            // Get follow-up tasks
            const followUpTasks = taskData.filter((t) => t.taskType === 'FOLLOW_UP');

            setLeads(activeLeads);
            setTasks(followUpTasks);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load follow-ups');
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (lead: Lead) => {
        window.open(getCallLink(lead.mobile), '_blank');
        setSelectedLead(lead);
    };

    const handleRecordOutcome = (lead: Lead) => {
        setSelectedLead(lead);
        setIsOutcomeModalOpen(true);
    };

    const handleOutcomeSubmit = async (data: CallOutcomeFormData) => {
        if (!selectedLead || !employee) return;

        await recordCallOutcome(selectedLead.id, employee.id, 'FOLLOW_UP', data);
        toast.success('Call outcome recorded');
        loadData();
    };

    // Get task info for each lead
    const getLeadTask = (leadId: string): Task | undefined => {
        return tasks.find((t) => t.leadId === leadId);
    };

    // Sort leads: overdue first, then by due date
    const sortedLeads = [...leads].sort((a, b) => {
        const taskA = getLeadTask(a.id);
        const taskB = getLeadTask(b.id);

        if (!taskA && !taskB) return 0;
        if (!taskA) return 1;
        if (!taskB) return -1;

        const overdueA = isOverdue(taskA.dueDate);
        const overdueB = isOverdue(taskB.dueDate);

        if (overdueA && !overdueB) return -1;
        if (!overdueA && overdueB) return 1;

        return taskA.dueDate.toMillis() - taskB.dueDate.toMillis();
    });

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const overdueCount = tasks.filter((t) => isOverdue(t.dueDate)).length;

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900">Follow-Ups</h1>
                    <Badge variant="success">Pipeline B</Badge>
                </div>
                <p className="text-gray-500">Warm leads from applications</p>
            </div>

            {/* Overdue Alert */}
            {overdueCount > 0 && (
                <Card className="mb-4 bg-red-50 border-red-200">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                            <p className="font-medium text-red-800">
                                {overdueCount} Overdue Follow-up{overdueCount > 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-red-600">Please prioritize these calls</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stats */}
            <Card className="mb-6 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-green-600">Follow-ups Pending</p>
                        <p className="text-2xl font-bold text-green-900">{leads.length}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                        <CalendarCheck className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </Card>

            {/* Follow-ups List */}
            {sortedLeads.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<User className="w-12 h-12" />}
                        title="No follow-ups pending"
                        description="Great job! All follow-ups are complete"
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {sortedLeads.map((lead) => {
                        const task = getLeadTask(lead.id);
                        const isTaskOverdue = task && isOverdue(task.dueDate);

                        return (
                            <Card
                                key={lead.id}
                                className={`p-4 ${isTaskOverdue ? 'border-red-200 bg-red-50/30' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isTaskOverdue ? 'bg-red-100' : 'bg-green-100'
                                            }`}
                                    >
                                        <span
                                            className={`text-sm font-medium ${isTaskOverdue ? 'text-red-600' : 'text-green-600'
                                                }`}
                                        >
                                            {lead.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">{lead.name}</h3>
                                            {isTaskOverdue && (
                                                <Badge variant="danger" size="sm">OVERDUE</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{formatPhone(lead.mobile)}</p>
                                        {lead.applicationNumber && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                App: {lead.applicationNumber}
                                            </p>
                                        )}
                                        {task && (
                                            <p
                                                className={`text-xs mt-1 ${isTaskOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                                                    }`}
                                            >
                                                Due: {getDueDateLabel(task.dueDate)}
                                            </p>
                                        )}
                                        <Badge
                                            variant={lead.currentStage === 'CONTACTED' ? 'default' : 'info'}
                                            size="sm"
                                            className="mt-2"
                                        >
                                            {lead.currentStage}
                                        </Badge>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleCall(lead)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Phone size={16} className="mr-1" />
                                            Call
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRecordOutcome(lead)}
                                        >
                                            <MessageSquare size={16} className="mr-1" />
                                            Log
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Call Outcome Modal */}
            <CallOutcomeModal
                isOpen={isOutcomeModalOpen}
                onClose={() => setIsOutcomeModalOpen(false)}
                onSubmit={handleOutcomeSubmit}
                leadName={selectedLead?.name || ''}
            />
        </div>
    );
}
