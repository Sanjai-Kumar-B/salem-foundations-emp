import { Timestamp } from 'firebase/firestore';

// ============ ENUMS & CONSTANTS ============

export type UserRole = 'ADMIN' | 'COUNSELLOR';
export type LeadSource = 'BULK' | 'APPLICATION';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type Pipeline = 'BULK' | 'FOLLOW_UP';
export type TaskType = 'CALL' | 'FOLLOW_UP' | 'DOCUMENT';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';

export type LeadStage =
    | 'NEW'
    | 'CONTACTED'
    | 'QUALIFIED'
    | 'UNQUALIFIED'
    | 'CONVERTED'
    | 'CLOSED';

export type InterestLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type Readiness = 'READY_NOW' | 'NEXT_MONTH' | 'NEXT_QUARTER' | 'UNDECIDED';
export type NextAction = 'FOLLOW_UP' | 'SEND_INFO' | 'CLOSE_QUALIFIED' | 'CLOSE_UNQUALIFIED';

// ============ FIRESTORE MODELS ============

/**
 * Employee / Counsellor document
 * Collection: employees/{employeeId}
 */
export interface Employee {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
    dailyCallTarget: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastLoginAt?: Timestamp;
    firstCallTimeToday?: Timestamp;
}

/**
 * Lead / Student document
 * Collection: leads/{leadId}
 */
export interface Lead {
    id: string;
    name: string;
    mobile: string;
    email?: string;
    source: LeadSource;
    applicationNumber?: string; // Links to Application System
    assignedEmployeeId?: string;
    priority: Priority;
    currentStage: LeadStage;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    // Additional info from bulk upload
    course?: string;
    location?: string;
    notes?: string;
}

/**
 * Task document
 * Collection: tasks/{taskId}
 */
export interface Task {
    id: string;
    employeeId: string;
    leadId: string;
    leadName: string; // Denormalized for quick display
    pipeline: Pipeline;
    taskType: TaskType;
    dueDate: Timestamp;
    status: TaskStatus;
    description?: string;
    notes?: string;        // Optional task notes
    createdAt: Timestamp;
    updatedAt?: Timestamp; // Tracked in mockFirestore
    completedAt?: Timestamp;
}

/**
 * Call Outcome document
 * Collection: call_outcomes/{outcomeId}
 */
export interface CallOutcome {
    id: string;
    leadId: string;
    employeeId: string;
    pipeline: Pipeline;
    connected: boolean;
    interestLevel?: InterestLevel;
    readiness?: Readiness;
    nextAction: NextAction;
    followUpDate?: Timestamp; // Mandatory if interested
    notes: string;
    callDuration?: number;    // Call duration in seconds
    createdAt: Timestamp;
}

/**
 * Activity Log for tracking login times, calls, etc.
 * Collection: activity_logs/{logId}
 */
export interface ActivityLog {
    id: string;
    employeeId: string;
    type: 'LOGIN' | 'LOGOUT' | 'FIRST_CALL' | 'CALL_COMPLETED' | 'TASK_COMPLETED';
    timestamp: Timestamp;
    metadata?: Record<string, unknown>;
}

// ============ FORM TYPES ============

export interface CallOutcomeFormData {
    connected: boolean;
    interestLevel?: InterestLevel;
    readiness?: Readiness;
    nextAction: NextAction;
    followUpDate?: Date;
    notes: string;
}

export interface EmployeeFormData {
    email: string;
    name: string;
    phone: string;
    role: UserRole;
    dailyCallTarget: number;
    isActive?: boolean; // defaults to true on creation
}

export interface LeadImportData {
    name: string;
    mobile: string;
    email?: string;
    course?: string;
    location?: string;
    notes?: string;
}

// ============ UI TYPES ============

export interface DashboardMetrics {
    totalCalls: number;
    connectedCalls: number;
    qualifiedLeads: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    conversionRate: number;
}

export interface CounsellorDashboardData {
    todaysTasks: Task[];
    callTarget: number;
    callsMade: number;
    overdueCount: number;
    newLeadsCount: number;
    followUpsCount: number;
}

export interface AdminReportData {
    employees: {
        id: string;
        name: string;
        totalCalls: number;
        connectedCalls: number;
        qualifiedLeads: number;
        conversionRate: number;
        avgCallTime?: number;
        loginTime?: Timestamp;
        firstCallTime?: Timestamp;
    }[];
    dateRange: {
        start: Date;
        end: Date;
    };
}
