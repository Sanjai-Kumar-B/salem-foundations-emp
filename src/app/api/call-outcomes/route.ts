/**
 * POST /api/call-outcomes — Record a call outcome for a lead
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const CALL_OUTCOMES_COL = 'call_outcomes';
const LEADS_COL = 'leads';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const leadId = searchParams.get('leadId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let query: FirebaseFirestore.Query = adminDb.collection(CALL_OUTCOMES_COL);

  if (session.role === 'COUNSELLOR') {
    query = query.where('employeeId', '==', session.uid);
  } else if (employeeId) {
    query = query.where('employeeId', '==', employeeId);
  }

  if (leadId) {
    query = query.where('leadId', '==', leadId);
  }

  const snapshot = await query.limit(500).get();
  const startDate = start ? new Date(start).getTime() : null;
  const endDate = end ? new Date(end).getTime() : null;

  const outcomes = snapshot.docs
    .map((doc): Record<string, unknown> => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
    .filter((outcome) => {
      const createdAt = outcome['createdAt'] as { toDate?: () => Date } | undefined;
      const createdAtMillis = createdAt?.toDate ? createdAt.toDate().getTime() : null;

      if (startDate !== null && (createdAtMillis === null || createdAtMillis < startDate)) {
        return false;
      }

      if (endDate !== null && (createdAtMillis === null || createdAtMillis > endDate)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      const leftCreatedAt = left['createdAt'] as { toDate?: () => Date } | undefined;
      const rightCreatedAt = right['createdAt'] as { toDate?: () => Date } | undefined;
      const leftTime = leftCreatedAt?.toDate ? leftCreatedAt.toDate().getTime() : 0;
      const rightTime = rightCreatedAt?.toDate ? rightCreatedAt.toDate().getTime() : 0;
      return rightTime - leftTime;
    });

  return NextResponse.json({ outcomes });
}

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

  let status = 'CONTACTED';
  let currentStage = 'CONTACTED';

  if (outcome === 'INTERESTED' || outcome === 'CALL_LATER') {
    status = 'INTERESTED';
    currentStage = 'QUALIFIED';
  } else if (outcome === 'NOT_INTERESTED' || outcome === 'WRONG_NUMBER') {
    status = 'NOT_INTERESTED';
    currentStage = 'UNQUALIFIED';
  } else if (outcome === 'CONVERTED') {
    status = 'CONVERTED';
    currentStage = 'CONVERTED';
  }

  // Update lead's lastContactedAt
  await adminDb.collection(LEADS_COL).doc(leadId).update({
    lastContactedAt: now,
    lastContactedBy: session.uid,
    status,
    currentStage,
    lastOutcome: outcome,
    lastCallDuration: duration ?? 0,
    nextFollowUp: nextCallDate ? new Date(nextCallDate) : null,
    lastActivityAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
