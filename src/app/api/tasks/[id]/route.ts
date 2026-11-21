import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const TASKS_COL = 'tasks';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const doc = await adminDb.collection(TASKS_COL).doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const task = doc.data()!;
  const ownerId = task.employeeId ?? task.assignedEmployeeId;
  if (session.role === 'COUNSELLOR' && ownerId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden: not your task' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (body.dueDate) {
    updates.dueDate = new Date(body.dueDate);
  }
  if (body.status) {
    updates.status = body.status;
    if (body.status === 'COMPLETED') {
      updates.completedAt = FieldValue.serverTimestamp();
    }
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }
  if (body.description !== undefined) {
    updates.description = body.description;
  }

  await adminDb.collection(TASKS_COL).doc(id).update(updates);
  return NextResponse.json({ success: true });
}
