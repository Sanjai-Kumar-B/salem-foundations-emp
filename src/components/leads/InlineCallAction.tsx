import React, { useState, useEffect } from 'react';
import { Lead, StrictCallOutcome } from '@/types';

interface InlineCallActionProps {
    lead: Lead;
    onSubmitOutcome: (duration: number, outcome: StrictCallOutcome, notes: string, followUpDate?: Date) => Promise<void>;
}

export function InlineCallAction({ lead, onSubmitOutcome }: InlineCallActionProps) {
    const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
    const [selectedOutcome, setSelectedOutcome] = useState<StrictCallOutcome | null>(null);
    const [notes, setNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Call tracking
    useEffect(() => {
        if (!callStartedAt) {
            setCallStartedAt(Date.now());
        }
    }, [callStartedAt]);

    const handleActionClick = (outcome: StrictCallOutcome) => {
        setSelectedOutcome(outcome);
        
        // If outcome doesn't need follow-up or long notes, we can auto-submit optionally,
        // but for now we just show the note/follow-up field if needed.
        if (['NOT_INTERESTED', 'WRONG_NUMBER', 'NO_RESPONSE'].includes(outcome)) {
            // Direct submission
            submit(outcome, notes, undefined);
        }
    };

    const submit = async (outcome: StrictCallOutcome, submitNotes: string, followUp?: Date) => {
        setIsSubmitting(true);
        const duration = callStartedAt ? Math.floor((Date.now() - callStartedAt) / 1000) : 0;
        await onSubmitOutcome(duration, outcome, submitNotes, followUp);
        setIsSubmitting(false);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOutcome) return;
        submit(selectedOutcome, notes, followUpDate ? new Date(followUpDate) : undefined);
    };

    if (isSubmitting) return <div className="p-4 text-center text-sm text-gray-500">Saving outcome...</div>;

    if (!selectedOutcome) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50 mt-4 shadow-sm">
                <p className="text-sm font-semibold mb-3">Call in progress... Select outcome:</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleActionClick('INTERESTED')} className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200">Interested</button>
                    <button onClick={() => handleActionClick('CALL_LATER')} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200">Call Later</button>
                    <button onClick={() => handleActionClick('NO_RESPONSE')} className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm font-medium hover:bg-yellow-200">No Response</button>
                    <button onClick={() => handleActionClick('NOT_INTERESTED')} className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200">Not Interested</button>
                    <button onClick={() => handleActionClick('WRONG_NUMBER')} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">Wrong Number</button>
                    <button onClick={() => handleActionClick('CONVERTED')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200">Converted</button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleFormSubmit} className="p-4 border rounded-lg bg-gray-50 mt-4 shadow-sm">
            <h4 className="text-sm font-bold mb-3">Outcome: {selectedOutcome.replace('_', ' ')}</h4>
            
            {['INTERESTED', 'CALL_LATER', 'CONVERTED'].includes(selectedOutcome) && (
                <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date (Required)</label>
                    <input 
                        type="datetime-local" 
                        required 
                        className="w-full border-gray-300 rounded-md text-sm p-2"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                </div>
            )}
            
            <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes {['INTERESTED'].includes(selectedOutcome) ? '(Required)' : '(Optional)'}
                </label>
                <textarea 
                    className="w-full border-gray-300 rounded-md text-sm p-2" 
                    rows={2} 
                    placeholder="Brief notes from the call..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required={selectedOutcome === 'INTERESTED'}
                    minLength={selectedOutcome === 'INTERESTED' ? 10 : 0}
                />
            </div>
            
            <div className="flex gap-2">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition">
                    Save Outcome
                </button>
                <button type="button" onClick={() => setSelectedOutcome(null)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition">
                    Cancel
                </button>
            </div>
        </form>
    );
}