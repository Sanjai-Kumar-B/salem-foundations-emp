/**
 * PATCH /api/tasks/[id]/complete — Mark task as completed
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const TASKS_COL = 'tasks';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const doc = await adminDb.collection(TASKS_COL).doc(params.id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const task = doc.data()!;

  // COUNSELLOR can only complete their own tasks
  if (session.role === 'COUNSELLOR' && task.assignedEmployeeId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden: not your task' }, { status: 403 });
  }

  await adminDb.collection(TASKS_COL).doc(params.id).update({
    status: 'COMPLETED',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
