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

  let query = adminDb.collection(TASKS_COL).orderBy('dueDate', 'asc') as FirebaseFirestore.Query;

  // COUNSELLOR sees only their own tasks
  if (session.role === 'COUNSELLOR') {
    query = query.where('assignedEmployeeId', '==', session.uid);
  }

  if (status) query = query.where('status', '==', status);

  if (today) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query = query.where('dueDate', '>=', start).where('dueDate', '<=', end);
  }

  const snapshot = await query.limit(100).get();
  const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { leadId, type, description, dueDate, assignedEmployeeId } = body;

  if (!leadId || !type || !dueDate) {
    return NextResponse.json({ error: 'leadId, type, dueDate are required' }, { status: 400 });
  }

  // COUNSELLOR can only create tasks assigned to themselves
  const targetEmployee =
    session.role === 'ADMIN' ? (assignedEmployeeId ?? session.uid) : session.uid;

  const now = FieldValue.serverTimestamp();
  const ref = await adminDb.collection(TASKS_COL).add({
    leadId,
    type,
    description: description ?? '',
    dueDate: new Date(dueDate),
    status: 'PENDING',
    assignedEmployeeId: targetEmployee,
    createdBy: session.uid,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
