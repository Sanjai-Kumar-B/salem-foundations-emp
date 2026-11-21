'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui';
import {
    Phone,
    ChevronLeft,
    ChevronRight,
    MapPin,
    X,
    CheckCircle,
} from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    phone: string;
    course: string;
    location: string;
    priority: 'high' | 'medium' | 'low';
    temperature: 'hot' | 'warm' | 'cold';
    isOverdue: boolean;
    lastOutcome?: string;
    nextFollowUp?: string;
    conversionProbability?: number;
}

interface CallingConsoleProps {
    lead: Lead;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    onOutcome?: (outcome: string, nextFollowUpDate?: string, notes?: string, duration?: number) => void;
}

type CallOutcome = 'Interested' | 'Not Interested' | 'No Response' | 'Call Later' | 'Wrong Number';
type CallState = 'ready' | 'calling' | 'inCall' | 'outcome' | 'scheduling';

const WHATSAPP_TEMPLATES = [
    { id: 'brochure', label: 'Brochure', emoji: '📄', text: 'Hello {name}, here is the course brochure & details for {course} at Salem Foundations: https://salemfoundations.edu.in/brochure' },
    { id: 'fees', label: 'Fee Details', emoji: '💰', text: 'Hello {name}, here is the fee structure and scholarship details for {course}: https://salemfoundations.edu.in/fees' },
    { id: 'campus', label: 'Campus Photos', emoji: '📸', text: 'Hello {name}, check out photos of our campus, hostel & laboratories: https://salemfoundations.edu.in/campus' },
    { id: 'apply', label: 'Application Link', emoji: '🎯', text: 'Hello {name}, apply online now for admission into {course}: https://salemfoundations.edu.in/apply' },
];

export default function CallingConsole({
    lead,
    onNext,
    onPrev,
    onClose,
    onOutcome,
}: CallingConsoleProps) {
    const [callState, setCallState] = useState<CallState>('ready');
    const [callDuration, setCallDuration] = useState(0);
    const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
    const [callNotes, setCallNotes] = useState('');

    // Live call timer
    useEffect(() => {
        if (callState !== 'inCall') return;

        const timer = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [callState]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const startCall = () => {
        setCallState('calling');
        setCallDuration(0);
        setTimeout(() => {
            setCallState('inCall');
        }, 500);
    };

    const endCall = () => {
        setCallState('outcome');
    };

    const sendWhatsApp = (templateId: string) => {
        const rawDigits = (lead.phone || '').replace(/\D/g, '');
        const cleanPhone = rawDigits.startsWith('91') && rawDigits.length === 12 ? rawDigits : `91${rawDigits.slice(-10)}`;
        const template = WHATSAPP_TEMPLATES.find((t) => t.id === templateId);
        let msg = template ? template.text : 'Hello from Salem Foundations';
        msg = msg.replace('{name}', lead.name || 'Student').replace('{course}', lead.course || 'the course');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const submitOutcome = (outcome: CallOutcome) => {
        setSelectedOutcome(outcome);
        if (outcome === 'Interested' || outcome === 'Call Later') {
            setCallState('scheduling');
        } else {
            setCallState('ready');
            onOutcome?.(outcome, undefined, callNotes, callDuration);
            setCallNotes('');
            setTimeout(() => {
                onNext();
            }, 500);
        }
    };

    const calculateFollowUpDate = (slot: string): string => {
        const d = new Date();
        if (slot === 'Today') {
            d.setHours(d.getHours() + 3);
        } else if (slot === 'Tomorrow') {
            d.setDate(d.getDate() + 1);
            d.setHours(10, 0, 0, 0);
        } else if (slot === 'This Week') {
            d.setDate(d.getDate() + 3);
            d.setHours(11, 0, 0, 0);
        } else if (slot === 'Next Week') {
            d.setDate(d.getDate() + 7);
            d.setHours(10, 0, 0, 0);
        }
        return d.toISOString();
    };

    const scheduleFollowUp = (slot: string) => {
        const dateIso = calculateFollowUpDate(slot);
        const outcomeLabel = selectedOutcome || 'Interested';
        onOutcome?.(outcomeLabel, dateIso, callNotes || `Follow up scheduled: ${slot}`, callDuration);
        setCallState('ready');
        setCallNotes('');
        setTimeout(() => {
            onNext();
        }, 500);
    };

    if (callState === 'calling') {
        return (
            <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white">
                <div className="mb-8 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
                            <Phone size={48} className="animate-pulse" />
                        </div>
                    </div>
                    <p className="text-xl font-semibold">Calling...</p>
                    <p className="text-sm text-white/70" data-testid="calling-lead-name">{lead.name}</p>
                </div>
                <button
                    onClick={() => {
                        setCallState('inCall');
                    }}
                    className="px-12 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg active:scale-95 transition-transform"
                >
                    Pick Up
                </button>
            </div>
        );
    }

    if (callState === 'inCall') {
        return (
            <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
                {/* Header */}
                <div className="px-4 py-6 text-center border-b border-white/10">
                    <p className="text-sm text-white/70 uppercase tracking-wide">{lead.course}</p>
                    <h2 className="text-3xl font-bold mt-2" data-testid="incall-lead-name">{lead.name}</h2>
                    <div className="mt-4 flex justify-center gap-2">
                        <Badge variant="danger" size="sm">ON CALL</Badge>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-6xl font-bold tabular-nums" data-testid="call-timer">{formatDuration(callDuration)}</p>
                        <p className="text-white/70 text-sm mt-2">Call in progress</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-4 pb-20 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {WHATSAPP_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => sendWhatsApp(template.id)}
                                className="py-3 px-2 rounded-xl bg-white/10 hover:bg-emerald-600/30 text-white font-semibold text-xs active:scale-95 transition-all text-center"
                            >
                                {template.emoji} {template.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={endCall}
                        className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg"
                    >
                        End Call
                    </button>
                </div>
            </div>
        );
    }

    if (callState === 'outcome') {
        return (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
                <div className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between rounded-t-3xl">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Call Outcome
                            </p>
                            <p className="text-lg font-bold text-slate-900">{lead.name}</p>
                        </div>
                        <button
                            onClick={() => setCallState('inCall')}
                            className="p-2 rounded-full hover:bg-slate-100"
                        >
                            <ChevronLeft size={24} className="text-slate-600" />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <p className="text-sm text-slate-700">
                                {callDuration > 0
                                    ? `Call duration: ${formatDuration(callDuration)}. What was the outcome?`
                                    : 'Select an outcome for this call'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {(
                                [
                                    'Interested',
                                    'Not Interested',
                                    'No Response',
                                    'Call Later',
                                    'Wrong Number',
                                ] as CallOutcome[]
                            ).map((outcome) => (
                                <button
                                    key={outcome}
                                    onClick={() => submitOutcome(outcome)}
                                    className={`p-4 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                                        selectedOutcome === outcome
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {outcome}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                                Call Notes
                            </label>
                            <textarea
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                placeholder="Enter notes from the call..."
                                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                            />
                        </div>

                        {selectedOutcome && selectedOutcome !== 'Interested' && selectedOutcome !== 'Call Later' && (
                            <button
                                onClick={() => submitOutcome(selectedOutcome)}
                                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold active:scale-95 transition-transform"
                            >
                                Submit & Next Lead
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (callState === 'scheduling') {
        return (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
                <div className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between rounded-t-3xl">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                                Schedule Follow-up
                            </p>
                            <p className="text-lg font-bold text-slate-900">{lead.name}</p>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                            <div className="flex gap-2 items-start">
                                <CheckCircle size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-emerald-800">
                                    <strong>{selectedOutcome === 'Call Later' ? 'Call back requested' : 'Lead interested!'}</strong> Select when you would like to follow up.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {['Today', 'Tomorrow', 'This Week', 'Next Week'].map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => scheduleFollowUp(slot)}
                                    className="w-full p-4 rounded-2xl bg-slate-100 hover:bg-emerald-100 text-slate-900 font-semibold active:scale-95 transition-all text-left flex justify-between items-center"
                                >
                                    <span>{slot}</span>
                                    <span className="text-xs text-slate-500">Schedule</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => scheduleFollowUp('Tomorrow')}
                            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                        >
                            Skip & Set Tomorrow Default
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Ready state - main calling console
    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 flex items-center justify-between">
                <button onClick={onPrev} className="p-2 rounded-full hover:bg-white" aria-label="Previous lead">
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white" aria-label="Close console">
                    <X size={24} className="text-slate-600" />
                </button>
            </div>

            {/* Lead Hero */}
            <div className="px-4 py-4 flex-1 overflow-y-auto">
                {/* Lead Card */}
                <div
                    className={`rounded-3xl p-6 text-white shadow-xl mb-4 ${
                        lead.temperature === 'hot'
                            ? 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-500'
                            : lead.temperature === 'warm'
                              ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                              : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                    }`}
                >
                    {/* Badges */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {lead.isOverdue && <Badge variant="danger" size="sm">⏰ OVERDUE</Badge>}
                        {lead.temperature === 'hot' && <Badge variant="danger" size="sm">🔥 HOT LEAD</Badge>}
                        {lead.priority === 'high' && <Badge variant="warning" size="sm">🎯 HIGH PRIORITY</Badge>}
                        {lead.conversionProbability && lead.conversionProbability > 80 && (
                            <Badge variant="success" size="sm">⚡ {lead.conversionProbability}% CONV</Badge>
                        )}
                    </div>

                    {/* Lead Name & Phone */}
                    <div className="mb-4">
                        <h1 className="text-4xl font-bold leading-tight" data-testid="lead-name">{lead.name}</h1>
                        <div className="flex items-center gap-2 mt-3 text-white/90">
                            <Phone size={18} />
                            <p className="text-lg font-semibold" data-testid="lead-phone">{lead.phone}</p>
                        </div>
                    </div>

                    {/* Course & Location */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-white/70">Course</p>
                            <p className="text-sm font-semibold mt-1">{lead.course}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={18} />
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-white/70">Location</p>
                                <p className="text-sm font-semibold mt-1">{lead.location}</p>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    {lead.lastOutcome && (
                        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm mb-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-white/70">Last Outcome</p>
                                <p className="text-sm font-semibold mt-1">{lead.lastOutcome}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-white/70">Follow-up</p>
                                <p className="text-sm font-semibold mt-1">{lead.nextFollowUp || '-'}</p>
                            </div>
                        </div>
                    )}

                    {/* Conviction Note */}
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                        <p className="text-xs font-medium text-white/95">
                            High conversion probability. Lead is actively engaged and ready for admission.
                        </p>
                    </div>
                </div>

                {/* Quick WhatsApp Actions */}
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                        Quick Send
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {WHATSAPP_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => sendWhatsApp(template.id)}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 active:scale-95 transition-all"
                            >
                                {template.emoji} {template.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-6 space-y-3 border-t border-slate-200 bg-white">
                <button
                    onClick={startCall}
                    data-testid="start-call-button"
                    className="w-full flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-5 text-lg font-bold text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                    <Phone size={24} />
                    START CALLING NOW
                </button>

                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={onPrev}
                        className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 active:scale-95"
                    >
                        <ChevronLeft size={18} />
                        Previous
                    </button>

                    <button
                        onClick={onNext}
                        className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 active:scale-95"
                    >
                        Skip
                    </button>

                    <button
                        onClick={onNext}
                        className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 active:scale-95"
                    >
                        Next
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
