/**
 * POST /api/tasks         — Create a task (admin or counsellor for self)
 * GET  /api/tasks         — List tasks
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const TASKS_COL = 'tasks';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const today = searchParams.get('today') === 'true';

  try {
    let query = adminDb.collection(TASKS_COL) as FirebaseFirestore.Query;

    // COUNSELLOR sees only their own tasks
    if (session.role === 'COUNSELLOR') {
      query = query.where('employeeId', '==', session.uid);
    }

    if (status) query = query.where('status', '==', status);

    const snapshot = await query.limit(100).get();
    let tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter by today if requested
    if (today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      tasks = tasks.filter((task) => {
        const dueTime = (task.dueDate as any)?.toMillis?.() ?? 0;
        return dueTime >= start.getTime() && dueTime <= end.getTime();
      });
    }

    // Sort by dueDate
    tasks.sort((a, b) => {
      const timeA = (a.dueDate as any)?.toMillis?.() ?? 0;
      const timeB = (b.dueDate as any)?.toMillis?.() ?? 0;
      return timeA - timeB;
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { leadId, type, description, dueDate, assignedEmployeeId, leadName, pipeline } = body;

  if (!leadId || !type || !dueDate) {
    return NextResponse.json({ error: 'leadId, type, dueDate are required' }, { status: 400 });
  }

  // COUNSELLOR can only create tasks assigned to themselves
  const targetEmployee =
    session.role === 'ADMIN' ? (assignedEmployeeId ?? session.uid) : session.uid;

  const now = FieldValue.serverTimestamp();
  const ref = await adminDb.collection(TASKS_COL).add({
    leadId,
    taskType: type,
    type,
    leadName: leadName ?? 'Lead',
    pipeline: pipeline ?? 'BULK',
    description: description ?? '',
    dueDate: new Date(dueDate),
    status: 'PENDING',
    employeeId: targetEmployee,
    assignedEmployeeId: targetEmployee,
    createdBy: session.uid,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
