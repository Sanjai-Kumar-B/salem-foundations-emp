import { Timestamp } from 'firebase/firestore';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api-client';
import {
  CallOutcome,
  Employee,
  Lead,
  LeadActivity,
  LeadImportData,
  Pipeline,
  Task,
  WhatsAppTemplate,
  StrictCallOutcome,
} from '@/types';

type UnknownRecord = Record<string, unknown>;

const COLLECTIONS = {
  employees: 'employees',
  leads: 'leads',
  tasks: 'tasks',
  callOutcomes: 'call_outcomes',
  activities: 'activities',
};

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'default-greeting',
    name: 'Greeting',
    content: 'Hi {name}, thank you for your interest. We will contact you shortly.',
    createdAt: Timestamp.now(),
  },
  {
    id: 'default-followup',
    name: 'Follow Up',
    content: 'Hi {name}, this is a reminder for your scheduled counselling call.',
    createdAt: Timestamp.now(),
  },
];

function toTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value && typeof value === 'object' && 'seconds' in (value as object) && 'nanoseconds' in (value as object)) {
    const maybe = value as { seconds: number; nanoseconds: number };
    return new Timestamp(maybe.seconds, maybe.nanoseconds);
  }
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return Timestamp.now();
}

function mapEmployee(raw: UnknownRecord): Employee {
  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    phone: String(raw.phone ?? ''),
    role: (raw.role as Employee['role']) ?? 'COUNSELLOR',
    isActive: Boolean(raw.isActive ?? true),
    dailyCallTarget: Number(raw.dailyCallTarget ?? 25),
    createdAt: toTimestamp(raw.createdAt),
    updatedAt: toTimestamp(raw.updatedAt),
    lastLoginAt: raw.lastLoginAt ? toTimestamp(raw.lastLoginAt) : undefined,
    firstCallTimeToday: raw.firstCallTimeToday ? toTimestamp(raw.firstCallTimeToday) : undefined,
  };
}

function mapLead(raw: UnknownRecord): Lead {
  const source = (raw.source as Lead['source']) === 'APPLICATION' ? 'APPLICATION' : 'BULK';
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    mobile: String(raw.mobile ?? ''),
    fatherName: raw.fatherName ? String(raw.fatherName) : undefined,
    email: raw.email ? String(raw.email) : undefined,
    source,
    applicationNumber: raw.applicationNumber ? String(raw.applicationNumber) : undefined,
    assignedEmployeeId: raw.assignedEmployeeId ? String(raw.assignedEmployeeId) : undefined,
    assignedBy: raw.assignedBy ? String(raw.assignedBy) : undefined,
    assignmentType: raw.assignmentType as Lead['assignmentType'],
    priority: (raw.priority as Lead['priority']) ?? 'MEDIUM',
    status: (raw.status as Lead['status']) ?? 'NEW',
    currentStage: (raw.currentStage as Lead['currentStage']) ?? 'NEW',
    nextFollowUp: raw.nextFollowUp ? toTimestamp(raw.nextFollowUp) : undefined,
    lastCallDuration: raw.lastCallDuration ? Number(raw.lastCallDuration) : undefined,
    lastOutcome: raw.lastOutcome as Lead['lastOutcome'],
    lastActivityAt: raw.lastActivityAt ? toTimestamp(raw.lastActivityAt) : undefined,
    createdAt: toTimestamp(raw.createdAt),
    updatedAt: toTimestamp(raw.updatedAt),
    gender: raw.gender ? String(raw.gender) : undefined,
    district: raw.district ? String(raw.district) : undefined,
    school: raw.school ? String(raw.school) : undefined,
    course: raw.course ? String(raw.course) : undefined,
    location: raw.location ? String(raw.location) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
  };
}

function mapTask(raw: UnknownRecord): Task {
  return {
    id: String(raw.id ?? ''),
    employeeId: String(raw.employeeId ?? raw.assignedEmployeeId ?? ''),
    leadId: String(raw.leadId ?? ''),
    leadName: String(raw.leadName ?? 'Lead'),
    pipeline: (raw.pipeline as Pipeline) ?? 'BULK',
    taskType: (raw.taskType as Task['taskType']) ?? 'FOLLOW_UP',
    dueDate: toTimestamp(raw.dueDate),
    status: (raw.status as Task['status']) ?? 'PENDING',
    description: raw.description ? String(raw.description) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    createdAt: toTimestamp(raw.createdAt),
    updatedAt: raw.updatedAt ? toTimestamp(raw.updatedAt) : undefined,
    completedAt: raw.completedAt ? toTimestamp(raw.completedAt) : undefined,
  };
}

function mapCallOutcome(raw: UnknownRecord): CallOutcome {
  const connected = Boolean(raw.connected ?? (raw.outcome === 'INTERESTED' || raw.outcome === 'CALL_LATER'));
  return {
    id: String(raw.id ?? ''),
    leadId: String(raw.leadId ?? ''),
    employeeId: String(raw.employeeId ?? ''),
    pipeline: (raw.pipeline as Pipeline) ?? 'BULK',
    connected,
    interestLevel: raw.interestLevel as CallOutcome['interestLevel'],
    readiness: raw.readiness as CallOutcome['readiness'],
    nextAction: (raw.nextAction as CallOutcome['nextAction']) ?? 'FOLLOW_UP',
    followUpDate: raw.followUpDate ? toTimestamp(raw.followUpDate) : undefined,
    notes: String(raw.notes ?? ''),
    callDuration: raw.callDuration ? Number(raw.callDuration) : Number(raw.duration ?? 0),
    createdAt: toTimestamp(raw.createdAt ?? raw.calledAt),
  };
}

export async function getAllEmployees(activeOnly = false): Promise<Employee[]> {
  const query = activeOnly ? '?activeOnly=true' : '';
  const response = await apiGet<{ employees: UnknownRecord[] }>(`/api/employees${query}`);
  return (response.employees ?? []).map((e) => mapEmployee(e));
}

export async function getAllLeads(): Promise<Lead[]> {
  const response = await apiGet<{ leads: UnknownRecord[] }>('/api/leads');
  return (response.leads ?? []).map((lead) => mapLead(lead));
}

export async function getLeadsByEmployee(employeeId: string, pipeline?: Pipeline): Promise<Lead[]> {
  const allLeads = await getAllLeads();
  return allLeads.filter((lead) => {
    if (lead.assignedEmployeeId !== employeeId) return false;
    if (pipeline === 'BULK' && lead.source !== 'BULK') return false;
    if (pipeline === 'FOLLOW_UP' && lead.source !== 'APPLICATION') return false;
    return true;
  });
}

export async function getTodaysTasks(employeeId: string): Promise<Task[]> {
  const response = await apiGet<{ tasks: UnknownRecord[] }>('/api/tasks?today=true');
  return (response.tasks ?? []).map((task) => mapTask(task)).filter((task) => task.employeeId === employeeId);
}

export async function getOverdueTasks(employeeId: string): Promise<Task[]> {
  const response = await apiGet<{ tasks: UnknownRecord[] }>('/api/tasks?status=PENDING');
  const now = Date.now();
  return (response.tasks ?? [])
    .map((task) => mapTask(task))
    .filter((task) => task.employeeId === employeeId && task.dueDate.toMillis() < now);
}

export async function getTodaysCallCount(employeeId: string): Promise<number> {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const outcomes = await getCallOutcomesByEmployee(employeeId, start, end);
  return outcomes.length;
}

export async function getCallOutcomesByEmployee(employeeId: string, start?: Date, end?: Date): Promise<CallOutcome[]> {
  const search = new URLSearchParams();
  search.set('employeeId', employeeId);
  if (start) search.set('start', start.toISOString());
  if (end) search.set('end', end.toISOString());

  const response = await apiGet<{ outcomes: UnknownRecord[] }>(`/api/call-outcomes?${search.toString()}`);
  return (response.outcomes ?? []).map((item) => mapCallOutcome(item));
}

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const search = new URLSearchParams();
  search.set('leadId', leadId);
  const response = await apiGet<{ outcomes: UnknownRecord[] }>(`/api/call-outcomes?${search.toString()}`);

  return (response.outcomes ?? []).map((item) => {
    const outcome = String(item.outcome ?? 'NO_RESPONSE') as StrictCallOutcome;
    const connected = !['NO_RESPONSE', 'WRONG_NUMBER'].includes(outcome);

    return {
      id: String(item.id ?? ''),
      leadId,
      type: 'call',
      callStatus: connected ? 'connected' : 'not_connected',
      outcome,
      duration: Number(item.duration ?? item.callDuration ?? 0),
      note: String(item.notes ?? ''),
      timestamp: toTimestamp(item.createdAt ?? item.calledAt),
      employeeId: String(item.employeeId ?? ''),
    } as LeadActivity;
  });
}

export async function getAllWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  return DEFAULT_WHATSAPP_TEMPLATES;
}

export async function recordCallOutcome(
  leadId: string,
  employeeId: string,
  pipeline: Pipeline,
  data: {
    connected: boolean;
    duration?: number;
    outcome: StrictCallOutcome;
    followUpDate?: Date;
    notes: string;
  }
): Promise<string> {
  const response = await apiPost<{ id: string }>('/api/call-outcomes', {
    leadId,
    employeeId,
    pipeline,
    outcome: data.outcome,
    duration: data.duration ?? 0,
    notes: data.notes,
    nextCallDate: data.followUpDate?.toISOString(),
  });

  // Keep lead stage in sync for queueing.
  await apiPatch('/api/leads/' + leadId, {
    currentStage: data.outcome === 'INTERESTED' ? 'QUALIFIED' : data.outcome === 'CONVERTED' ? 'CONVERTED' : 'CONTACTED',
    notes: data.notes,
  });

  return response.id;
}

export async function getEmployeeStats(employeeId: string, start: Date, end: Date): Promise<{ totalCalls: number; connectedCalls: number }> {
  const calls = await getCallOutcomesByEmployee(employeeId, start, end);
  return {
    totalCalls: calls.length,
    connectedCalls: calls.filter((call) => call.connected).length,
  };
}

export async function getEmployeePerformanceMetrics(
  employeeId: string
): Promise<{ totalLeadsAssigned: number; followUpsScheduled: number; conversions: number; conversionRate: number }> {
  const leads = await getLeadsByEmployee(employeeId);
  const totalLeadsAssigned = leads.length;
  const followUpsScheduled = leads.filter((lead) => !!lead.nextFollowUp).length;
  const conversions = leads.filter((lead) => lead.status === 'CONVERTED').length;
  const conversionRate = totalLeadsAssigned
    ? Math.round((conversions / totalLeadsAssigned) * 100)
    : 0;

  return {
    totalLeadsAssigned,
    followUpsScheduled,
    conversions,
    conversionRate,
  };
}

export async function createEmployee(data: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: Employee['role'];
  dailyCallTarget?: number;
}): Promise<string> {
  const response = await apiPost<{ id: string }>('/api/employees', data);
  return response.id;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await apiPatch('/api/employees/' + id, { isActive: false });
}

export async function createLead(data: Partial<Lead> & { name: string; mobile: string; source: Lead['source'] }): Promise<string> {
  const response = await apiPost<{ id: string }>('/api/leads', {
    name: data.name,
    mobile: data.mobile,
    email: data.email,
    source: data.source,
    priority: data.priority ?? 'MEDIUM',
  });
  return response.id;
}

export async function importLeads(
  leads: LeadImportData[],
  _skipDuplicates: boolean = true
): Promise<{ imported: number; duplicates: number }> {
  const response = await apiPost<{ added: number; skipped: number }>('/api/leads/import', { leads });
  return {
    imported: response.added,
    duplicates: response.skipped,
  };
}

export async function assignLeadsToEmployee(
  leadIds: string[],
  employeeId: string,
  assignmentType: 'MANUAL' | 'AUTO' | 'FILTER' = 'MANUAL'
): Promise<void> {
  await Promise.all(
    leadIds.map((leadId) =>
      apiPatch('/api/leads/' + leadId, {
        assignedEmployeeId: employeeId,
        assignmentType,
      })
    )
  );
}

export async function deleteLead(leadId: string): Promise<void> {
  const response = await apiDelete<{ success: boolean }>(`/api/leads/${leadId}`);
  if (!response.success) {
    throw new Error('Failed to delete lead');
  }
}

export {
  COLLECTIONS,
};
