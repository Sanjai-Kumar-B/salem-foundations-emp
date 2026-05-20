'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, Select } from '@/components/ui';
import { InlineCallAction } from '@/components/leads/InlineCallAction';
import { useAuth } from '@/hooks/useAuth';
import {
    getLeadActivities,
    getLeadsByEmployee,
    recordCallOutcome,
    getAllWhatsAppTemplates,
} from '@/lib/firestore';
import { formatActivityType, formatDate, formatPhone, getLeadStatusColor } from '@/lib/utils';
import { Lead, LeadActivity, WhatsAppTemplate, StrictCallOutcome } from '@/types';
import { getNextLead } from '@/lib/nextBestAction';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { Phone, RefreshCw, MessageSquare, FastForward, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CallingMachinePage() {
    const router = useRouter();
    const { employee } = useAuth();

    const [currentLead, setCurrentLead] = useState<Lead | null>(null);
    const [actionReason, setActionReason] = useState<string | null>(null);
    const [activities, setActivities] = useState<LeadActivity[]>([]);
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isCalling, setIsCalling] = useState(false);

    useEffect(() => {
        if (!employee) return;
        loadData();
    }, [employee]);

    useEffect(() => {
        if (currentLead) {
            loadActivities(currentLead.id);
            setIsCalling(false);
            setSelectedTemplateId('');
        }
    }, [currentLead]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (!employee) return;
            const [assigned, tpls] = await Promise.all([
                getLeadsByEmployee(employee.id),
                getAllWhatsAppTemplates()
            ]);
            setTemplates(tpls);
            pickNextLead(assigned);
        } catch (error) {
            console.error('Failed to load calling machine data:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const pickNextLead = (leads: Lead[]) => {
        const { lead, reason } = getNextLead(leads);
        setCurrentLead(lead as Lead | null);
        setActionReason(reason);
    };

    const loadActivities = async (leadId: string) => {
        try {
            const timeline = await getLeadActivities(leadId);
            setActivities(timeline);
        } catch (error) {
            console.error('Failed to load activities:', error);
        }
    };

    const handleCallClick = () => {
        if (!currentLead) return;
        setIsCalling(true);
        // Open dialer automatically
        window.open(`tel:${currentLead.mobile.replace(/\\D/g, '')}`, '_self');
    };

    const handleOutcomeSubmit = async (duration: number, outcome: StrictCallOutcome, notes: string, followUpDate?: Date) => {
        if (!employee || !currentLead) return;
        
        try {
            const isConnected = !['NO_RESPONSE', 'WRONG_NUMBER'].includes(outcome);
            await recordCallOutcome(
                currentLead.id,
                employee.id,
                currentLead.source === 'APPLICATION' ? 'FOLLOW_UP' : 'BULK',
                {
                    connected: isConnected,
                    duration,
                    outcome,
                    followUpDate,
                    notes
                }
            );
            toast.success('Outcome saved!');
            
            // Instantly fetch next
            await loadData(true);
        } catch (err) {
            toast.error('Failed to save outcome');
            console.error(err);
        }
    };

    const handleSendWhatsApp = () => {
        if (!currentLead) return;
        if (!selectedTemplateId) {
            toast.error('Select a WA template first');
            return;
        }
        const template = templates.find((t) => t.id === selectedTemplateId);
        if (!template) return;

        const link = getWhatsAppLink(currentLead, template);
        window.open(link, '_blank');
    };

    const handleSkip = () => {
        // In a real app we'd mark this skipped in state to temporarily hide it or put it to end of queue.
        // For now, we'll just reload. True skip would require a local exclusion list.
        toast('Skipping lead...', { icon: '⏭️' });
        loadData(true);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                    <p className="text-gray-500 font-medium">Finding next best lead...</p>
                </div>
            </div>
        );
    }

    if (!currentLead) {
        return (
            <div className="flex h-screen items-center justify-center p-6 bg-gray-50">
                <Card className="max-w-md w-full text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
                    <p className="text-gray-500 mb-6">You have zero pending tasks or overdue follow-ups.</p>
                    <button 
                        onClick={() => loadData()}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
                    >
                        Refresh Queue
                    </button>
                </Card>
            </div>
        );
    }

    const reasonLabels: Record<string, {label: string, color: string}> = {
        'OVERDUE': { label: '🔥 Overdue Follow-up', color: 'bg-red-100 text-red-800' },
        'FOLLOW_UP_TODAY': { label: '📅 Scheduled Today', color: 'bg-blue-100 text-blue-800' },
        'NEW': { label: '🌟 New Lead', color: 'bg-green-100 text-green-800' },
        'OTHER': { label: '➡️ Next in Queue', color: 'bg-gray-100 text-gray-800' }
    };

    const reasonInfo = actionReason ? reasonLabels[actionReason] || reasonLabels['OTHER'] : reasonLabels['OTHER'];

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-xl text-gray-900">Calling Console</h1>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${reasonInfo.color}`}>
                            {reasonInfo.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="p-4 max-w-3xl mx-auto mt-4 space-y-4">
                
                {/* Lead Details */}
                <Card className="shadow-md border-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 leading-tight">{currentLead.name}</h2>
                            <p className="text-xl text-gray-600 mt-1">{formatPhone(currentLead.mobile)}</p>
                        </div>
                        <Badge className={`${getLeadStatusColor(currentLead.status)} text-sm px-3 py-1`}>
                            {currentLead.status.replace('_', ' ')}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                        <div>
                            <span className="text-gray-500 text-xs font-bold uppercase">Target Course</span>
                            <p className="font-semibold text-gray-900">{currentLead.course || 'Not specified'}</p>
                        </div>
                        <div>
                            <span className="text-gray-500 text-xs font-bold uppercase">Location/District</span>
                            <p className="font-semibold text-gray-900">{currentLead.location || currentLead.district || 'Not specified'}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-500 text-xs font-bold uppercase">Context / Notes</span>
                            <p className="font-medium text-gray-800 mt-1">{currentLead.notes || 'No system notes.'}</p>
                        </div>
                    </div>
                </Card>

                {/* WA Integration */}
                <Card className="border-0 shadow-sm mt-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <Select
                            className="w-full flex-grow text-sm"
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            options={[
                                { value: '', label: 'Select WhatsApp Template...' },
                                ...templates.map((t) => ({ value: t.id, label: t.name }))
                            ]}
                        />
                        <button 
                            onClick={handleSendWhatsApp}
                            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-md font-medium hover:bg-[#1ebe57]"
                        >
                            <MessageSquare size={18} />
                            Send WA
                        </button>
                    </div>
                </Card>

                {/* Action Area */}
                <div id="action-area" className="mt-8">
                    {!isCalling ? (
                        <button 
                            onClick={handleCallClick}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center py-8 text-2xl font-black shadow-lg rounded-2xl transition"
                        >
                            <Phone size={32} className="mr-3" />
                            CALL NOW
                        </button>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <InlineCallAction 
                                lead={currentLead} 
                                onSubmitOutcome={handleOutcomeSubmit} 
                            />
                        </div>
                    )}
                </div>

                {/* History Section */}
                {activities.length > 0 && (
                    <Card className="mt-8 border-0 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 px-2">Recent Activity</h3>
                        <div className="space-y-4 px-2">
                            {activities.map((activity) => (
                                <div key={activity.id} className="text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex gap-2">
                                            <span className="font-bold text-gray-700">{formatActivityType(activity.type)}</span>
                                            {activity.outcome && (
                                                <span className="text-indigo-600 font-semibold">{activity.outcome.replace('_', ' ')}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">{formatDate(activity.timestamp, 'MMM d, h:mm a')}</span>
                                    </div>
                                    {activity.note && <p className="text-gray-600">{activity.note}</p>}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Mobile Sticky Skip Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden">
                <button 
                    onClick={handleSkip}
                    className="w-full flex items-center justify-center gap-2 text-gray-600 font-medium py-3 bg-gray-100 rounded-xl"
                >
                    SKIP TO NEXT <FastForward size={18} />
                </button>
            </div>
            
            {/* Desktop Skip */}
            <div className="hidden md:flex fixed bottom-6 right-6">
                <button 
                    onClick={handleSkip}
                    className="flex items-center justify-center gap-2 text-gray-600 font-bold py-3 px-6 bg-white shadow-lg border border-gray-200 rounded-full hover:bg-gray-50"
                >
                    SKIP <FastForward size={18} />
                </button>
            </div>
        </div>
    );
}