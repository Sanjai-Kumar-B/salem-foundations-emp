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
} from './mockData';
import {
    Employee,
    Lead,
    Task,
    CallOutcome,
    LeadImportData,
    CallOutcomeFormData,
    LeadSource,
} from '@/types';

// In-memory data stores (mutable copies)
let employees = [...mockEmployees];
let leads = [...mockLeads];
let tasks = [...mockTasks];
let callOutcomes = [...mockCallOutcomes];

// Helper to generate IDs
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
            currentStage: 'NEW',
            course: lead.course,
            location: lead.location,
            notes: lead.notes,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        imported++;
    }

    return { imported, duplicates };
}

export async function assignLeadsToEmployee(leadIds: string[], employeeId: string): Promise<void> {
    await delay(100);
    for (const leadId of leadIds) {
        const index = leads.findIndex((l) => l.id === leadId);
        if (index !== -1) {
            leads[index] = {
                ...leads[index],
                assignedEmployeeId: employeeId,
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

    // Create call outcome record
    const id = generateId();
    const outcome: CallOutcome = {
        id,
        leadId,
        employeeId,
        pipeline,
        connected: data.connected,
        interestLevel: data.interestLevel,
        readiness: data.readiness,
        nextAction: data.nextAction,
        followUpDate: data.followUpDate ? Timestamp.fromDate(data.followUpDate) : undefined,
        notes: data.notes,
        createdAt: Timestamp.now(),
    };
    callOutcomes.push(outcome);

    // Update lead stage based on outcome
    if (data.connected) {
        if (data.nextAction === 'CLOSE_QUALIFIED') {
            await updateLeadStage(leadId, 'QUALIFIED');
        } else if (data.nextAction === 'CLOSE_UNQUALIFIED') {
            await updateLeadStage(leadId, 'UNQUALIFIED');
        } else {
            await updateLeadStage(leadId, 'CONTACTED');
        }
    }

    // Create follow-up task if needed
    if (data.followUpDate) {
        const lead = await getLead(leadId);
        await createTask({
            employeeId,
            leadId,
            leadName: lead?.name || 'Unknown',
            taskType: 'FOLLOW_UP',
            pipeline,
            status: 'PENDING',
            dueDate: Timestamp.fromDate(data.followUpDate),
            notes: data.notes,
        });
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
        qualifiedLeads: outcomes.filter((c) => c.nextAction === 'CLOSE_QUALIFIED').length,
    };
}

// ============ HELPERS ============

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export everything needed
export const COLLECTIONS = {
    employees: 'employees',
    leads: 'leads',
    tasks: 'tasks',
    call_outcomes: 'call_outcomes',
    activity_logs: 'activity_logs',
};
