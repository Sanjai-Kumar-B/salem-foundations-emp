/**
 * Mock Firestore Service
 * 
 * This file provides mock implementations of Firestore operations
 * for safe testing without touching the production database.
 */

import { Timestamp } from 'firebase/firestore';
import {
    mockEmployees,
    mockLeads,
    mockTasks,
    mockCallOutcomes,
    mockActivities,
    mockConversions,
} from './mockData';
import {
    Employee,
    Lead,
    Task,
    CallOutcome,
    LeadActivity,
    Conversion,
    LeadStatus,
    LeadImportData,
    CallOutcomeFormData,
    LeadSource,
    WhatsAppTemplate,
} from '@/types';

// In-memory data stores (mutable copies)
const employees = [...mockEmployees];
const leads = [...mockLeads];
const tasks = [...mockTasks];
const callOutcomes = [...mockCallOutcomes];
const activities = [...mockActivities];
const conversions = [...mockConversions];
const whatsappTemplates: WhatsAppTemplate[] = [
    { id: '1', name: 'Greeting', content: 'Hi {name}, thank you for registering with Salem Foundations.', createdAt: Timestamp.now() },
    { id: '2', name: 'Follow Up', content: 'Hello {name}, this is a follow-up regarding your application.', createdAt: Timestamp.now() },
    { id: '3', name: 'Call Later', content: 'Hi {name}, we tried calling you. Please let us know when is a good time to call back.', createdAt: Timestamp.now() }
];

// Helper to generate IDs
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getAllWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    await delay(100);
    return [...whatsappTemplates];
}

// ============ EMPLOYEE OPERATIONS ============

export async function getEmployee(id: string): Promise<Employee | null> {
    await delay(100);
    return employees.find((e) => e.id === id) || null;
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
    await delay(100);
    return employees.find((e) => e.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function getAllEmployees(activeOnly: boolean = false): Promise<Employee[]> {
    await delay(150);
    if (activeOnly) {
        return employees.filter((e) => e.isActive);
    }
    return [...employees];
}

export async function createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await delay(100);
    const id = generateId();
    const now = Timestamp.now();
    const newEmployee: Employee = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
    };
    employees.push(newEmployee);
    return id;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
    await delay(100);
    const index = employees.findIndex((e) => e.id === id);
    if (index !== -1) {
        employees[index] = {
            ...employees[index],
            ...data,
            updatedAt: Timestamp.now(),
        };
    }
}

export async function deactivateEmployee(id: string): Promise<void> {
    await updateEmployee(id, { isActive: false });
}

export async function logEmployeeActivity(
    employeeId: string,
    action: 'LOGIN' | 'LOGOUT' | 'CALL' | 'UPDATE'
): Promise<void> {
    await delay(50);
    console.log(`[Mock] Employee ${employeeId} activity: ${action}`);
}

// ============ LEAD OPERATIONS ============

export async function getLead(id: string): Promise<Lead | null> {
    await delay(100);
    return leads.find((l) => l.id === id) || null;
}

export async function getLeadsByEmployee(
    employeeId: string,
    pipeline?: 'BULK' | 'FOLLOW_UP'
): Promise<Lead[]> {
    await delay(150);
    let filtered = leads.filter((l) => l.assignedEmployeeId === employeeId);
    if (pipeline === 'BULK') {
        filtered = filtered.filter((l) => l.source === 'BULK');
    } else if (pipeline === 'FOLLOW_UP') {
        filtered = filtered.filter((l) => l.source === 'APPLICATION');
    }
    return filtered;
}

export async function getUnassignedLeads(source?: LeadSource): Promise<Lead[]> {
    await delay(100);
    let filtered = leads.filter((l) => !l.assignedEmployeeId);
    if (source) {
        filtered = filtered.filter((l) => l.source === source);
    }
    return filtered;
}

export async function getAllLeads(): Promise<Lead[]> {
    await delay(150);
    return [...leads];
}

export async function checkDuplicateLead(mobile: string): Promise<Lead | null> {
    await delay(50);
    const normalized = mobile.replace(/\D/g, '').slice(-10);
    return leads.find((l) => l.mobile.replace(/\D/g, '').slice(-10) === normalized) || null;
}

export async function importLeads(
    leadsData: LeadImportData[],
    skipDuplicates: boolean = true
): Promise<{ imported: number; duplicates: number }> {
    await delay(300);
    let imported = 0;
    let duplicates = 0;

    for (const lead of leadsData) {
        const normalized = lead.mobile.replace(/\D/g, '').slice(-10);

        if (skipDuplicates) {
            const existing = leads.find(
                (l) => l.mobile.replace(/\D/g, '').slice(-10) === normalized
            );
            if (existing) {
                duplicates++;
                continue;
            }
        }

        const id = generateId();
        leads.push({
            id,
            name: lead.name,
            mobile: normalized,
            email: lead.email,
            source: 'BULK',
            priority: 'MEDIUM',
            status: 'NEW',
            currentStage: 'NEW',
            course: lead.course,
            location: lead.location,
            notes: lead.notes,
            lastActivityAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        imported++;
    }

    return { imported, duplicates };
}

export async function assignLeadsToEmployee(
    leadIds: string[],
    employeeId: string,
    assignmentType: 'MANUAL' | 'AUTO' | 'FILTER' = 'MANUAL'
): Promise<void> {
    await delay(100);
    for (const leadId of leadIds) {
        const index = leads.findIndex((l) => l.id === leadId);
        if (index !== -1) {
            leads[index] = {
                ...leads[index],
                assignedEmployeeId: employeeId,
                assignmentType: assignmentType,
                updatedAt: Timestamp.now(),
            };
        }
    }
}

export async function updateLeadStage(
    leadId: string,
    stage: Lead['currentStage']
): Promise<void> {
    await delay(100);
    const index = leads.findIndex((l) => l.id === leadId);
    if (index !== -1) {
        leads[index] = {
            ...leads[index],
            currentStage: stage,
            updatedAt: Timestamp.now(),
        };
    }
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
    await delay(80);
    const index = leads.findIndex((l) => l.id === leadId);
    if (index === -1) return;

    leads[index] = {
        ...leads[index],
        status,
        currentStage: mapStatusToStage(status),
        updatedAt: Timestamp.now(),
    };
}

export async function updateLeadFollowUp(leadId: string, followUpDate?: Date): Promise<void> {
    await delay(80);
    const index = leads.findIndex((l) => l.id === leadId);
    if (index === -1) return;

    leads[index] = {
        ...leads[index],
        nextFollowUp: followUpDate ? Timestamp.fromDate(followUpDate) : undefined,
        updatedAt: Timestamp.now(),
    };
}

export async function getDueFollowUpLeads(employeeId: string): Promise<Lead[]> {
    await delay(120);
    const now = new Date();
    return leads
        .filter((lead) =>
            lead.assignedEmployeeId === employeeId &&
            !!lead.nextFollowUp &&
            lead.nextFollowUp.toDate() <= now &&
            lead.status !== 'CONVERTED'
        )
        .sort((a, b) => (a.nextFollowUp?.toMillis() || 0) - (b.nextFollowUp?.toMillis() || 0));
}

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    await delay(80);
    return activities
        .filter((item) => item.leadId === leadId)
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

export async function createLeadActivity(
    data: Omit<LeadActivity, 'id' | 'timestamp'> & { timestamp?: Date }
): Promise<string> {
    await delay(80);
    const id = generateId();
    const timestamp = data.timestamp ? Timestamp.fromDate(data.timestamp) : Timestamp.now();
    const activity: LeadActivity = {
        id,
        leadId: data.leadId,
        type: data.type,
        callStatus: data.callStatus,
        duration: data.duration,
        note: data.note,
        employeeId: data.employeeId,
        timestamp,
    };
    activities.push(activity);

    const leadIndex = leads.findIndex((l) => l.id === data.leadId);
    if (leadIndex !== -1) {
        leads[leadIndex] = {
            ...leads[leadIndex],
            lastActivityAt: timestamp,
            updatedAt: Timestamp.now(),
        };
    }

    return id;
}

export async function addLeadNote(leadId: string, employeeId: string, note: string): Promise<void> {
    await createLeadActivity({
        leadId,
        type: 'note',
        note,
        employeeId,
    });
}

export async function scheduleLeadFollowUp(
    leadId: string,
    employeeId: string,
    followUpDate: Date,
    note?: string
): Promise<void> {
    await updateLeadFollowUp(leadId, followUpDate);

    const lead = await getLead(leadId);
    await createTask({
        employeeId,
        leadId,
        leadName: lead?.name || 'Unknown',
        taskType: 'FOLLOW_UP',
        pipeline: lead?.source === 'APPLICATION' ? 'FOLLOW_UP' : 'BULK',
        status: 'PENDING',
        dueDate: Timestamp.fromDate(followUpDate),
        notes: note,
    });

    await createLeadActivity({
        leadId,
        type: 'followup',
        note: note || `Follow-up set for ${followUpDate.toLocaleString()}`,
        employeeId,
    });
}

export async function convertLeadToStudent(leadId: string, employeeId: string): Promise<string> {
    await updateLeadStatus(leadId, 'CONVERTED');
    await updateLeadFollowUp(leadId, undefined);

    const id = generateId();
    const conversion: Conversion = {
        id,
        leadId,
        convertedBy: employeeId,
        timestamp: Timestamp.now(),
    };
    conversions.push(conversion);

    await createLeadActivity({
        leadId,
        type: 'status_change',
        note: 'Lead converted to student',
        employeeId,
    });

    return id;
}

export async function getConversionsByEmployee(employeeId: string): Promise<Conversion[]> {
    await delay(80);
    return conversions.filter((item) => item.convertedBy === employeeId);
}

export async function getAllConversions(): Promise<Conversion[]> {
    await delay(80);
    return [...conversions];
}

// ============ TASK OPERATIONS ============

export async function getTask(id: string): Promise<Task | null> {
    await delay(100);
    return tasks.find((t) => t.id === id) || null;
}

export async function getTasksByEmployee(
    employeeId: string,
    status?: Task['status']
): Promise<Task[]> {
    await delay(100);
    let filtered = tasks.filter((t) => t.employeeId === employeeId);
    if (status) {
        filtered = filtered.filter((t) => t.status === status);
    }
    return filtered;
}

export async function getTodaysTasks(employeeId: string): Promise<Task[]> {
    await delay(100);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter((t) => {
        if (t.employeeId !== employeeId) return false;
        const dueDate = t.dueDate.toDate();
        return dueDate >= today && dueDate < tomorrow && t.status !== 'COMPLETED';
    });
}

export async function getOverdueTasks(employeeId: string): Promise<Task[]> {
    await delay(100);
    const now = new Date();
    return tasks.filter(
        (t) =>
            t.employeeId === employeeId &&
            t.status !== 'COMPLETED' &&
            t.dueDate.toDate() < now
    );
}

export async function createTask(
    data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    await delay(100);
    const id = generateId();
    const now = Timestamp.now();
    tasks.push({
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
    });
    return id;
}

export async function completeTask(id: string): Promise<void> {
    await delay(100);
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
        tasks[index] = {
            ...tasks[index],
            status: 'COMPLETED',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
    }
}

// ============ CALL OUTCOME OPERATIONS ============

export async function recordCallOutcome(
    leadId: string,
    employeeId: string,
    pipeline: 'BULK' | 'FOLLOW_UP',
    data: CallOutcomeFormData
): Promise<string> {
    await delay(150);

    const nextAction =
        data.outcome === 'INTERESTED' || data.outcome === 'CALL_LATER' || data.outcome === 'NO_RESPONSE'
            ? 'FOLLOW_UP'
            : data.outcome === 'NOT_INTERESTED' || data.outcome === 'WRONG_NUMBER'
                ? 'CLOSE_UNQUALIFIED'
                : 'CLOSE_QUALIFIED';

    const derivedStatus: LeadStatus =
        data.outcome === 'CONVERTED'
            ? 'CONVERTED'
            : data.outcome === 'INTERESTED'
                ? 'INTERESTED'
                : data.outcome === 'NOT_INTERESTED' || data.outcome === 'WRONG_NUMBER'
                    ? 'NOT_INTERESTED'
                    : 'CONTACTED';

    // Create call outcome record
    const id = generateId();
    const outcome: CallOutcome = {
        id,
        leadId,
        employeeId,
        pipeline,
        connected: data.connected,
        interestLevel: data.outcome === 'INTERESTED' ? 'HIGH' : (data.outcome === 'NOT_INTERESTED' || data.outcome === 'WRONG_NUMBER') ? 'NONE' : 'MEDIUM',
        nextAction,
        followUpDate: data.followUpDate ? Timestamp.fromDate(data.followUpDate) : undefined,
        notes: data.notes,
        callDuration: data.duration,
        createdAt: Timestamp.now(),
    };
    callOutcomes.push(outcome);

    const leadIndex = leads.findIndex(l => l.id === leadId);
    if (leadIndex >= 0) {
        leads[leadIndex] = {
            ...leads[leadIndex],
            status: derivedStatus,
            lastCallDuration: data.duration,
            lastOutcome: data.outcome,
            nextFollowUp: data.followUpDate ? Timestamp.fromDate(data.followUpDate) : leads[leadIndex].nextFollowUp,
            updatedAt: Timestamp.now(),
        };
    }

    await createLeadActivity({
        leadId,
        type: 'call',
        callStatus: data.connected ? 'connected' : 'not_connected',
        outcome: data.outcome,
        duration: data.duration,
        note: data.notes,
        employeeId,
    });

    await createLeadActivity({
        leadId,
        type: 'status_change',
        note: `Lead marked as ${derivedStatus}`,
        employeeId,
    });

    // Create follow-up task if needed
    if (data.followUpDate) {
        await scheduleLeadFollowUp(leadId, employeeId, data.followUpDate, data.notes);
    }

    return id;
}

export async function getCallOutcomesByLead(leadId: string): Promise<CallOutcome[]> {
    await delay(100);
    return callOutcomes.filter((c) => c.leadId === leadId);
}

export async function getCallOutcomesByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
): Promise<CallOutcome[]> {
    await delay(100);
    let filtered = callOutcomes.filter((c) => c.employeeId === employeeId);

    if (startDate) {
        filtered = filtered.filter((c) => c.createdAt.toDate() >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter((c) => c.createdAt.toDate() <= endDate);
    }

    return filtered;
}

export async function getTodaysCallCount(employeeId: string): Promise<number> {
    await delay(50);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return callOutcomes.filter((c) => {
        if (c.employeeId !== employeeId) return false;
        return c.createdAt.toDate() >= today;
    }).length;
}

// ============ REPORTING ============

export async function getEmployeeStats(
    employeeId: string,
    startDate: Date,
    endDate: Date
): Promise<{ totalCalls: number; connectedCalls: number; qualifiedLeads: number }> {
    await delay(100);

    const outcomes = callOutcomes.filter((c) => {
        if (c.employeeId !== employeeId) return false;
        const date = c.createdAt.toDate();
        return date >= startDate && date <= endDate;
    });

    return {
        totalCalls: outcomes.length,
        connectedCalls: outcomes.filter((c) => c.connected).length,
        qualifiedLeads: outcomes.filter((c) => c.nextAction === 'FOLLOW_UP' && c.interestLevel === 'HIGH').length,
    };
}

export async function getEmployeePerformanceMetrics(employeeId: string): Promise<{
    totalLeadsAssigned: number;
    callsMade: number;
    followUpsScheduled: number;
    conversions: number;
    conversionRate: number;
}> {
    await delay(100);

    const totalLeadsAssigned = leads.filter((lead) => lead.assignedEmployeeId === employeeId).length;
    const callsMade = activities.filter((item) => item.employeeId === employeeId && item.type === 'call').length;
    const followUpsScheduled = activities.filter((item) => item.employeeId === employeeId && item.type === 'followup').length;
    const conversionsCount = conversions.filter((item) => item.convertedBy === employeeId).length;
    const conversionRate = totalLeadsAssigned > 0 ? Math.round((conversionsCount / totalLeadsAssigned) * 100) : 0;

    return {
        totalLeadsAssigned,
        callsMade,
        followUpsScheduled,
        conversions: conversionsCount,
        conversionRate,
    };
}

// ============ HELPERS ============

// mapStatusToStage or other helpers might go here

// Export everything needed
export const COLLECTIONS = {
    employees: 'employees',
    leads: 'leads',
    tasks: 'tasks',
    call_outcomes: 'call_outcomes',
    activities: 'activities',
    conversions: 'conversions',
    activity_logs: 'activity_logs',
};

function mapStatusToStage(status: LeadStatus): Lead['currentStage'] {
    switch (status) {
        case 'NEW':
            return 'NEW';
        case 'CONTACTED':
            return 'CONTACTED';
        case 'INTERESTED':
            return 'QUALIFIED';
        case 'NOT_INTERESTED':
            return 'UNQUALIFIED';
        case 'CONVERTED':
            return 'CONVERTED';
        default:
            return 'NEW';
    }
}
