/**
 * GET   /api/employees/[id]   — Get employee by ID
 * PATCH /api/employees/[id]   — Update employee (admin only)
 * DELETE /api/employees/[id]  — Deactivate employee (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, requireAdmin, isErrorResponse } from '@/lib/server-auth';

const EMPLOYEES_COL = 'employees';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  // COUNSELLOR can only read their own profile
  if (session.role === 'COUNSELLOR' && session.uid !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const doc = await adminDb.collection(EMPLOYEES_COL).doc(params.id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const allowedFields = ['name', 'phone', 'role', 'isActive', 'dailyCallTarget'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection(EMPLOYEES_COL).doc(params.id).update(updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  // Soft delete — set isActive: false (preserves history)
  await adminDb.collection(EMPLOYEES_COL).doc(params.id).update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
