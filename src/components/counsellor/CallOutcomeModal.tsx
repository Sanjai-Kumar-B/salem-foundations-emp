'use client';

import React, { useState } from 'react';
import { Modal, Button, Select, Textarea, Input } from '@/components/ui';
import { CallOutcomeFormData, InterestLevel, Readiness, NextAction } from '@/types';

interface CallOutcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CallOutcomeFormData) => Promise<void>;
    leadName: string;
}

export function CallOutcomeModal({
    isOpen,
    onClose,
    onSubmit,
    leadName,
}: CallOutcomeModalProps) {
    const [formData, setFormData] = useState<CallOutcomeFormData>({
        connected: false,
        nextAction: 'FOLLOW_UP',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation: Follow-up date mandatory if interested
        if (
            formData.connected &&
            formData.interestLevel &&
            formData.interestLevel !== 'NONE' &&
            formData.nextAction === 'FOLLOW_UP' &&
            !formData.followUpDate
        ) {
            setError('Follow-up date is required for interested leads');
            return;
        }

        // Validation: Notes are required
        if (!formData.notes.trim()) {
            setError('Please add notes about the call');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(formData);
            // Reset form
            setFormData({
                connected: false,
                nextAction: 'FOLLOW_UP',
                notes: '',
            });
            onClose();
        } catch {
            setError('Failed to save call outcome');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConnectedChange = (connected: boolean) => {
        setFormData({
            ...formData,
            connected,
            interestLevel: connected ? formData.interestLevel : undefined,
            readiness: connected ? formData.readiness : undefined,
            nextAction: connected ? 'FOLLOW_UP' : 'FOLLOW_UP',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Call Outcome" size="lg">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Lead Name */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-500">Recording outcome for</p>
                    <p className="font-semibold text-gray-900">{leadName}</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Connected? */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Did you connect with the student?
                    </label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => handleConnectedChange(true)}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${formData.connected
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            ✓ Yes, Connected
                        </button>
                        <button
                            type="button"
                            onClick={() => handleConnectedChange(false)}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${!formData.connected
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            ✗ No Answer
                        </button>
                    </div>
                </div>

                {/* If Connected - Show Interest & Readiness */}
                {formData.connected && (
                    <>
                        <Select
                            label="Interest Level *"
                            value={formData.interestLevel || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, interestLevel: e.target.value as InterestLevel })
                            }
                            placeholder="Select interest level"
                            options={[
                                { value: 'HIGH', label: '🔥 High - Very interested' },
                                { value: 'MEDIUM', label: '👍 Medium - Somewhat interested' },
                                { value: 'LOW', label: '🤔 Low - Needs convincing' },
                                { value: 'NONE', label: '❌ None - Not interested' },
                            ]}
                        />

                        <Select
                            label="Readiness to Join *"
                            value={formData.readiness || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, readiness: e.target.value as Readiness })
                            }
                            placeholder="Select readiness"
                            options={[
                                { value: 'READY_NOW', label: 'Ready to join now' },
                                { value: 'NEXT_MONTH', label: 'Next month' },
                                { value: 'NEXT_QUARTER', label: 'Next 3 months' },
                                { value: 'UNDECIDED', label: 'Undecided' },
                            ]}
                        />
                    </>
                )}

                {/* Next Action */}
                <Select
                    label="Next Action *"
                    value={formData.nextAction}
                    onChange={(e) =>
                        setFormData({ ...formData, nextAction: e.target.value as NextAction })
                    }
                    options={
                        formData.connected
                            ? [
                                { value: 'FOLLOW_UP', label: '📞 Schedule Follow-up' },
                                { value: 'SEND_INFO', label: '📧 Send Information' },
                                { value: 'CLOSE_QUALIFIED', label: '✅ Close as Qualified' },
                                { value: 'CLOSE_UNQUALIFIED', label: '❌ Close as Unqualified' },
                            ]
                            : [
                                { value: 'FOLLOW_UP', label: '📞 Try Again Later' },
                            ]
                    }
                />

                {/* Follow-up Date - Required if interested */}
                {formData.nextAction === 'FOLLOW_UP' && (
                    <Input
                        label={
                            formData.connected && formData.interestLevel !== 'NONE'
                                ? 'Follow-up Date * (Required for interested leads)'
                                : 'Follow-up Date'
                        }
                        type="datetime-local"
                        value={
                            formData.followUpDate
                                ? new Date(formData.followUpDate.getTime() - formData.followUpDate.getTimezoneOffset() * 60000)
                                    .toISOString()
                                    .slice(0, 16)
                                : ''
                        }
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                followUpDate: e.target.value ? new Date(e.target.value) : undefined,
                            })
                        }
                        min={new Date().toISOString().slice(0, 16)}
                    />
                )}

                {/* Notes */}
                <Textarea
                    label="Notes *"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="What was discussed? Any important details?"
                    rows={3}
                />

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={submitting}>
                        Save Outcome
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
