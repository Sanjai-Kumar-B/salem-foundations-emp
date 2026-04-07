'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Badge, LoadingSpinner, EmptyState, Button } from '@/components/ui';
import { CallOutcomeModal } from '@/components/counsellor/CallOutcomeModal';
import { useAuth } from '@/hooks/useAuth';
import { getLeadsByEmployee, recordCallOutcome } from '@/lib/firestore';
import { Lead, CallOutcomeFormData } from '@/types';
import { formatPhone, getCallLink, getPriorityColor } from '@/lib/utils';
import { Phone, MessageSquare, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewLeadsPage() {
    const { employee } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);

    useEffect(() => {
        if (employee) {
            loadLeads();
        }
    }, [employee]);

    const loadLeads = async () => {
        if (!employee) return;
        try {
            const data = await getLeadsByEmployee(employee.id, 'BULK');
            // Filter to show only NEW or CONTACTED leads
            const activeLeads = data.filter((l) => ['NEW', 'CONTACTED'].includes(l.currentStage));
            setLeads(activeLeads);
        } catch (error) {
            console.error('Error loading leads:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (lead: Lead) => {
        // Open Calley/phone dialer
        window.open(getCallLink(lead.mobile), '_blank');
        // Set selected lead for outcome recording
        setSelectedLead(lead);
    };

    const handleRecordOutcome = (lead: Lead) => {
        setSelectedLead(lead);
        setIsOutcomeModalOpen(true);
    };

    const handleOutcomeSubmit = async (data: CallOutcomeFormData) => {
        if (!selectedLead || !employee) return;

        await recordCallOutcome(selectedLead.id, employee.id, 'BULK', data);
        toast.success('Call outcome recorded');
        loadLeads();
    };

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
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900">New Leads</h1>
                    <Badge variant="info">Pipeline A</Badge>
                </div>
                <p className="text-gray-500">Cold leads for qualification</p>
            </div>

            {/* Stats */}
            <Card className="mb-6 bg-indigo-50 border-indigo-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-indigo-600">Leads to Call</p>
                        <p className="text-2xl font-bold text-indigo-900">{leads.length}</p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-lg">
                        <Phone className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>
            </Card>

            {/* Leads List */}
            {leads.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<User className="w-12 h-12" />}
                        title="No new leads"
                        description="All leads have been contacted or qualified"
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {leads.map((lead) => (
                        <Card key={lead.id} className="p-4">
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-medium text-gray-600">
                                        {lead.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 truncate">{lead.name}</h3>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(lead.priority)}`}
                                        >
                                            {lead.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">{formatPhone(lead.mobile)}</p>
                                    {lead.course && (
                                        <p className="text-xs text-gray-400 mt-1">Interested in: {lead.course}</p>
                                    )}
                                    <Badge
                                        variant={lead.currentStage === 'NEW' ? 'info' : 'default'}
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
                    ))}
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
