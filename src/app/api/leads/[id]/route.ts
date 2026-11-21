/**
 * PATCH /api/leads/[id]   — Update lead stage / notes / dialing lock
 * DELETE /api/leads/[id]  — Delete a lead (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const LEADS_COL = 'leads';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const leadId = (await params).id;
  const docRef = adminDb.collection(LEADS_COL).doc(leadId);
  const doc = await docRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const lead = doc.data()!;

  // Allow counsellor to access if assigned OR if lead is unassigned and they are claiming/locking it
  const isAssignedToOther =
    session.role === 'COUNSELLOR' &&
    lead.assignedEmployeeId &&
    lead.assignedEmployeeId !== session.uid;

  if (isAssignedToOther) {
    return NextResponse.json({ error: 'Forbidden: not your assigned lead' }, { status: 403 });
  }

  const body = await request.json();
  const counsellorAllowed = [
    'currentStage',
    'notes',
    'interestLevel',
    'readiness',
    'nextAction',
    'status',
  ];
  const adminAllowed = [
    ...counsellorAllowed,
    'assignedEmployeeId',
    'assignmentType',
    'assignedBy',
    'assignedAt',
    'priority',
    'pipeline',
  ];

  const allowed = session.role === 'ADMIN' ? adminAllowed : counsellorAllowed;
  const updates: Record<string, unknown> = {};

  // Dialing Lock Handling (Prevents race conditions between agents)
  if (body.lockDialing) {
    const nowMillis = Date.now();
    const currentLockUntil = lead.dialingLockUntil?.toDate
      ? lead.dialingLockUntil.toDate().getTime()
      : lead.dialingLockUntil
        ? new Date(lead.dialingLockUntil).getTime()
        : 0;

    if (currentLockUntil > nowMillis && lead.dialingLockBy && lead.dialingLockBy !== session.uid) {
      return NextResponse.json(
        { error: 'Conflict: Lead is currently being dialed by another agent', locked: true },
        { status: 409 }
      );
    }

    updates.dialingLockUntil = new Date(nowMillis + 3 * 60 * 1000); // 3-minute lock window
    updates.dialingLockBy = session.uid;

    if (!lead.assignedEmployeeId) {
      updates.assignedEmployeeId = session.uid;
      updates.assignmentType = 'AUTO';
    }
  } else if (body.releaseDialing) {
    updates.dialingLockUntil = null;
    updates.dialingLockBy = null;
  }

  for (const field of allowed) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updatedAt = FieldValue.serverTimestamp();
  await docRef.update(updates);

  return NextResponse.json({ success: true, leadId, updates });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  // Only admin can delete leads
  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: only admins can delete leads' },
      { status: 403 }
    );
  }

  const leadId = (await params).id;
  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }

  await adminDb.collection(LEADS_COL).doc(leadId).delete();
  return NextResponse.json({ success: true, leadId });
}
