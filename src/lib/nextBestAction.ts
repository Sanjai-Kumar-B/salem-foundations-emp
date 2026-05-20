import { Lead } from '../types';

export interface NextActionRecommendation {
    lead: Readonly<Lead> | null;
    reason: 'OVERDUE' | 'FOLLOW_UP_TODAY' | 'NEW' | 'OTHER' | null;
}

/**
 * Returns the next best lead based on priority:
 * 1. Overdue follow-ups
 * 2. Today's scheduled follow-ups
 * 3. New uncontacted leads
 * 4. Others
 */
export function getNextLead(leads: Lead[]): NextActionRecommendation {
    if (!leads || leads.length === 0) {
        return { lead: null, reason: null };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(todayStart + 24 * 60 * 60 * 1000).getTime();
    const currentTime = now.getTime();

    // Helper to get time safely
    const getTime = (stamp: unknown): number => {
        if (!stamp) return 0;
        if (typeof stamp === 'object' && stamp !== null && 'toDate' in stamp && typeof (stamp as { toDate: unknown }).toDate === 'function') {
            return (stamp as { toDate(): Date }).toDate().getTime();
        }
        return new Date(stamp as string | number | Date).getTime();
    };

    // 1. Overdue follow-ups
    const overdueLeads = leads.filter(l => {
        if (!l.nextFollowUp) return false;
        const followUpTime = getTime(l.nextFollowUp);
        return followUpTime < currentTime && l.status !== 'CONVERTED' && l.status !== 'NOT_INTERESTED';
    });

    if (overdueLeads.length > 0) {
        overdueLeads.sort((a, b) => getTime(a.nextFollowUp) - getTime(b.nextFollowUp));
        return { lead: overdueLeads[0], reason: 'OVERDUE' };
    }

    // 2. Today's follow-ups
    const todayLeads = leads.filter(l => {
        if (!l.nextFollowUp) return false;
        const followUpTime = getTime(l.nextFollowUp);
        return followUpTime >= todayStart && followUpTime < todayEnd && l.status !== 'CONVERTED' && l.status !== 'NOT_INTERESTED';
    });

    if (todayLeads.length > 0) {
        todayLeads.sort((a, b) => getTime(a.nextFollowUp) - getTime(b.nextFollowUp));
        return { lead: todayLeads[0], reason: 'FOLLOW_UP_TODAY' };
    }

    // 3. New uncontacted leads
    const newLeads = leads.filter(l => l.status === 'NEW' || l.currentStage === 'NEW');
    
    if (newLeads.length > 0) {
        newLeads.sort((a, b) => {
            if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
            if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
            return getTime(b.createdAt) - getTime(a.createdAt);
        });
        return { lead: newLeads[0], reason: 'NEW' };
    }

    // 4. Others
    const otherLeads = leads.filter(l => l.status !== 'CONVERTED' && l.status !== 'NOT_INTERESTED' && l.status !== 'NEW');
    if (otherLeads.length > 0) {
        return { lead: otherLeads[0], reason: 'OTHER' };
    }

    return { lead: null, reason: null };
}