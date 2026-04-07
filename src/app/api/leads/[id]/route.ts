/**
 * PATCH /api/leads/[id]   — Update lead stage / notes (admin or assigned counsellor)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const LEADS_COL = 'leads';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const doc = await adminDb.collection(LEADS_COL).doc(params.id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const lead = doc.data()!;

  // COUNSELLOR can only update leads assigned to them
  if (session.role === 'COUNSELLOR' && lead.assignedEmployeeId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden: not your assigned lead' }, { status: 403 });
  }

  const body = await request.json();
  const counsellorAllowed = ['currentStage', 'notes', 'interestLevel', 'readiness', 'nextAction'];
  const adminAllowed = [...counsellorAllowed, 'assignedEmployeeId', 'priority', 'pipeline'];

  const allowed = session.role === 'ADMIN' ? adminAllowed : counsellorAllowed;
  const updates: Record<string, unknown> = {};

  for (const field of allowed) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updatedAt = FieldValue.serverTimestamp();
  await adminDb.collection(LEADS_COL).doc(params.id).update(updates);

  return NextResponse.json({ success: true });
}
