/**
 * POST /api/call-outcomes — Record a call outcome for a lead
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const CALL_OUTCOMES_COL = 'call_outcomes';
const LEADS_COL = 'leads';

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { leadId, outcome, notes, duration, nextCallDate } = body;

  if (!leadId || !outcome) {
    return NextResponse.json({ error: 'leadId and outcome are required' }, { status: 400 });
  }

  // Verify the lead exists and belongs to this counsellor (or user is admin)
  const leadDoc = await adminDb.collection(LEADS_COL).doc(leadId).get();
  if (!leadDoc.exists) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  if (
    session.role === 'COUNSELLOR' &&
    leadDoc.data()!.assignedEmployeeId !== session.uid
  ) {
    return NextResponse.json({ error: 'Forbidden: not your assigned lead' }, { status: 403 });
  }

  const now = FieldValue.serverTimestamp();
  const ref = await adminDb.collection(CALL_OUTCOMES_COL).add({
    leadId,
    employeeId: session.uid,
    outcome, // ANSWERED | VOICEMAIL | NO_ANSWER | CALLBACK_REQUESTED | etc.
    notes: notes ?? '',
    duration: duration ?? 0,
    nextCallDate: nextCallDate ? new Date(nextCallDate) : null,
    calledAt: now,
    createdAt: now,
  });

  // Update lead's lastContactedAt
  await adminDb.collection(LEADS_COL).doc(leadId).update({
    lastContactedAt: now,
    lastContactedBy: session.uid,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
