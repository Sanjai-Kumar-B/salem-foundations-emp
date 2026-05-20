import { Timestamp } from 'firebase/firestore';

// ============ ENUMS & CONSTANTS ============

export type UserRole = 'ADMIN' | 'COUNSELLOR';
export type LeadSource = 'BULK' | 'APPLICATION';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'NOT_INTERESTED' | 'CONVERTED';
export type Pipeline = 'BULK' | 'FOLLOW_UP';
export type TaskType = 'CALL' | 'FOLLOW_UP' | 'DOCUMENT';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';
export type StrictCallOutcome = 'INTERESTED' | 'NOT_INTERESTED' | 'CALL_LATER' | 'NO_RESPONSE' | 'WRONG_NUMBER' | 'CONVERTED';

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
    fatherName?: string;
    email?: string;
    source: LeadSource;
    applicationNumber?: string; // Links to Application System
    assignedEmployeeId?: string;
    assignedBy?: string;
    assignmentType?: 'MANUAL' | 'AUTO' | 'FILTER';
    priority: Priority;
    status: LeadStatus;
    currentStage: LeadStage;
    nextFollowUp?: Timestamp;
    lastCallDuration?: number;
    lastOutcome?: StrictCallOutcome;
    lastActivityAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    // Additional info from bulk upload
    gender?: string;
    district?: string;
    school?: string;
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
 * Lead activity timeline item
 * Collection: activities/{activityId}
 */
export interface LeadActivity {
    id: string;
    leadId: string;
    type: 'call' | 'note' | 'followup' | 'status_change';
    callStatus?: 'connected' | 'not_connected';
    outcome?: StrictCallOutcome;
    duration?: number;
    callStartedAt?: Timestamp;
    callEndedAt?: Timestamp;
    note?: string;
    timestamp: Timestamp;
    employeeId: string;
}

/**
 * Lead conversion event
 * Collection: conversions/{conversionId}
 */
export interface Conversion {
    id: string;
    leadId: string;
    convertedBy: string;
    timestamp: Timestamp;
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
    duration?: number;
    outcome: StrictCallOutcome;
    followUpDate?: Date;
    notes: string;
}

export interface WhatsAppTemplate {
    id: string;
    name: string;
    content: string;
    createdAt: Timestamp;
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
