'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { CallOutcomeFormData, StrictCallOutcome } from '@/types';

interface CallOutcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CallOutcomeFormData) => Promise<void>;
    leadName: string;
    callStartTime: number | null;
}

type FollowUpPreset = 'none' | '5m' | '15m' | '1h' | 'custom';

export function CallOutcomeModal({ isOpen, onClose, onSubmit, leadName, callStartTime }: CallOutcomeModalProps) {
    const [formData, setFormData] = useState<Partial<CallOutcomeFormData>>({
        connected: true,
        outcome: undefined,
        notes: '',
    });
    const [preset, setPreset] = useState<FollowUpPreset>('none');
    const [customDateTime, setCustomDateTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setFormData({ connected: true, outcome: undefined, notes: '' });
            setPreset('none');
            setCustomDateTime('');
            setError('');
        }
    }, [isOpen]);

    const computedFollowUp = useMemo(() => {
        const now = new Date();
        if (preset === '5m') return new Date(now.getTime() + 5 * 60 * 1000);
        if (preset === '15m') return new Date(now.getTime() + 15 * 60 * 1000);
        if (preset === '1h') return new Date(now.getTime() + 60 * 60 * 1000);
        if (preset === 'custom' && customDateTime) return new Date(customDateTime);
        return undefined;
    }, [preset, customDateTime]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.outcome) {
            setError('Please select an outcome for the call.');
            return;
        }

        if (!formData.notes || !formData.notes.trim()) {
            setError('Notes are mandatory. Please record what happened.');
            return;
        }

        const requiresFollowUp = ['INTERESTED', 'CALL_LATER'].includes(formData.outcome);
        if (requiresFollowUp && !computedFollowUp) {
            setError(`A follow-up time is required when marking a lead as ${formData.outcome.replace('_', ' ')}.`);
            return;
        }

        let durationSeconds = 0;
        if (callStartTime) {
            durationSeconds = Math.round((Date.now() - callStartTime) / 1000);
        }

        const payload: CallOutcomeFormData = {
            connected: formData.connected!,
            outcome: formData.outcome as StrictCallOutcome,
            notes: formData.notes.trim(),
            duration: durationSeconds,
            followUpDate: computedFollowUp,
        };

        setSaving(true);
        try {
            await onSubmit(payload);
            setFormData({ connected: true, outcome: undefined, notes: '' });
            onClose();
        } catch {
            setError('Failed to save call log');
        } finally {
            setSaving(false);
        }
    };

    const isConnectedDependent = ['INTERESTED', 'NOT_INTERESTED', 'CALL_LATER', 'CONVERTED'].includes(formData.outcome || '');

    useEffect(() => {
        if (['NO_RESPONSE', 'WRONG_NUMBER'].includes(formData.outcome || '')) {
            setFormData(prev => ({ ...prev, connected: false }));
        } else if (['INTERESTED', 'NOT_INTERESTED', 'CALL_LATER', 'CONVERTED'].includes(formData.outcome || '')) {
            setFormData(prev => ({ ...prev, connected: true }));
        }
    }, [formData.outcome]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log Call Outcome" size="lg">
            <form onSubmit={handleSave} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Lead</p>
                    <p className="font-semibold text-gray-900">{leadName}</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                        label="Call Outcome"
                        value={formData.outcome || ''}
                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value as StrictCallOutcome })}
                        options={[
                            { value: '', label: 'Select Outcome...' },
                            { value: 'INTERESTED', label: 'Interested' },
                            { value: 'CALL_LATER', label: 'Call Later' },
                            { value: 'CONVERTED', label: 'Converted directly' },
                            { value: 'NO_RESPONSE', label: 'No Response / Skipped' },
                            { value: 'WRONG_NUMBER', label: 'Wrong Number' },
                            { value: 'NOT_INTERESTED', label: 'Not Interested' },
                        ]}
                    />

                    <Select
                        label="Connection Status"
                        value={formData.connected ? 'connected' : 'not_connected'}
                        onChange={(e) => {
                            const connected = e.target.value === 'connected';
                            setFormData({ ...formData, connected });
                        }}
                        disabled={true} 
                        options={[
                            { value: 'connected', label: 'Connected' },
                            { value: 'not_connected', label: 'Not Connected' },
                        ]}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up {(formData.outcome === 'INTERESTED' || formData.outcome === 'CALL_LATER') && <span className="text-red-500">*</span>}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                            { key: 'none', label: 'No Follow-up' },
                            { key: '5m', label: '5 min' },
                            { key: '15m', label: '15 min' },
                            { key: '1h', label: '1 hour' },
                            { key: 'custom', label: 'Custom' },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setPreset(item.key as FollowUpPreset)}
                                className={`px-2 py-2 text-xs border rounded-lg ${
                                    preset === item.key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {preset === 'custom' && (
                    <Input
                        label="Custom Follow-up Time"
                        type="datetime-local"
                        value={customDateTime}
                        onChange={(e) => setCustomDateTime(e.target.value)}
                    />
                )}

                <Textarea
                    label="Call Notes"
                    rows={4}
                    placeholder="Must summarize key takeaways and the reason for the selected outcome."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />

                <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                        Discard
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={saving}>
                        Save Log
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
