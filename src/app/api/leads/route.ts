/**
 * GET  /api/leads         — List leads (admin: all, counsellor: assigned only)
 * POST /api/leads         — Create a single lead (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const LEADS_COL = 'leads';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const pipeline = searchParams.get('pipeline');

  let query = adminDb.collection(LEADS_COL).orderBy('createdAt', 'desc') as FirebaseFirestore.Query;

  // COUNSELLOR sees only their own assigned leads
  if (session.role === 'COUNSELLOR') {
    query = query.where('assignedEmployeeId', '==', session.uid);
  }

  if (stage) query = query.where('currentStage', '==', stage);
  if (pipeline) query = query.where('source', '==', pipeline);

  const snapshot = await query.limit(200).get();
  const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  // Only admin can create leads directly
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: only admins can create leads' }, { status: 403 });
  }

  const body = await request.json();
  const { name, mobile, email, source, priority, pipeline } = body;

  if (!name || !mobile || !source) {
    return NextResponse.json({ error: 'name, mobile, source are required' }, { status: 400 });
  }

  // Duplicate check by mobile
  const existing = await adminDb
    .collection(LEADS_COL)
    .where('mobile', '==', mobile)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json(
      { error: 'Duplicate lead: a lead with this mobile number already exists', existing: true },
      { status: 409 }
    );
  }

  const now = FieldValue.serverTimestamp();
  const leadData = {
    name,
    mobile,
    email: email ?? null,
    source,
    priority: priority ?? 'MEDIUM',
    pipeline: pipeline ?? 'BULK',
    currentStage: 'NEW',
    createdAt: now,
    updatedAt: now,
  };

  const ref = await adminDb.collection(LEADS_COL).add(leadData);
  return NextResponse.json({ id: ref.id, ...leadData }, { status: 201 });
}
