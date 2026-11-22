/**
 * GET   /api/employees/[id]   — Get employee by ID
 * PATCH /api/employees/[id]   — Update employee (admin only)
 * DELETE /api/employees/[id]  — Deactivate employee (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { requireAuth, requireAdmin, isErrorResponse } from '@/lib/server-auth';

const EMPLOYEES_COL = 'employees';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const employeeId = (await params).id;

  // COUNSELLOR can only read their own profile
  if (session.role === 'COUNSELLOR' && session.uid !== employeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let doc = await adminDb.collection(EMPLOYEES_COL).doc(employeeId).get();

  // If document does not exist by UID, automatically re-link or provision
  if (!doc.exists) {
    // 1. Try matching by email
    const emailQuery = await adminDb
      .collection(EMPLOYEES_COL)
      .where('email', '==', session.email.toLowerCase())
      .get();

    if (!emailQuery.empty) {
      const existingDoc = emailQuery.docs[0];
      const data = existingDoc.data();
      // Re-link to the new UID
      await adminDb.collection(EMPLOYEES_COL).doc(employeeId).set({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (existingDoc.id !== employeeId) {
        await existingDoc.ref.delete();
      }
      try {
        await adminAuth.setCustomUserClaims(employeeId, {
          role: data.role || session.role,
          employeeId,
        });
      } catch (err) {
        console.warn('Could not set custom claim during re-link:', err);
      }
      doc = await adminDb.collection(EMPLOYEES_COL).doc(employeeId).get();
    } else if (session.role === 'ADMIN' || session.email.toLowerCase().includes('admin')) {
      // 2. Auto-provision Administrator profile if created in Firebase Console
      const newAdminPayload: Record<string, unknown> = {
        email: session.email.toLowerCase(),
        name: session.name && session.name !== session.email ? session.name : 'System Administrator',
        phone: '9876543200',
        role: 'ADMIN',
        isActive: true,
        dailyCallTarget: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await adminDb.collection(EMPLOYEES_COL).doc(employeeId).set(newAdminPayload);
      try {
        await adminAuth.setCustomUserClaims(employeeId, {
          role: 'ADMIN',
          employeeId,
        });
      } catch (err) {
        console.warn('Could not set admin claim during auto-provision:', err);
      }
      doc = await adminDb.collection(EMPLOYEES_COL).doc(employeeId).get();
    }
  }

  if (!doc.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const allowedFields = [
    'name',
    'phone',
    'role',
    'isActive',
    'dailyCallTarget',
    'dob',
    'joiningDate',
    'department',
    'designation',
    'alternatePhone',
    'address',
    'city',
  ];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection(EMPLOYEES_COL).doc(((await params).id)).update(updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const employeeId = (await params).id;
  const docRef = adminDb.collection(EMPLOYEES_COL).doc(employeeId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Unassign any leads currently assigned to this employee so they aren't orphaned
  const leadsSnapshot = await adminDb
    .collection('leads')
    .where('assignedEmployeeId', '==', employeeId)
    .get();

  if (!leadsSnapshot.empty) {
    const batch = adminDb.batch();
    leadsSnapshot.docs.forEach((leadDoc) => {
      batch.update(leadDoc.ref, {
        assignedEmployeeId: null,
        assignmentType: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // Delete employee document from collection
  await docRef.delete();

  return NextResponse.json({ success: true, removed: true });
}

