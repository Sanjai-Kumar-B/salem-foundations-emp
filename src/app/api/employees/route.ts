/**
 * GET  /api/employees   — List all employees (admin) or self (counsellor)
 * POST /api/employees   — Create a new employee (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { requireAuth, requireAdmin, isErrorResponse } from '@/lib/server-auth';
import type { Employee } from '@/types';

const EMPLOYEES_COL = 'employees';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('activeOnly') === 'true';

  let query = adminDb.collection(EMPLOYEES_COL).orderBy('name');
  if (activeOnly) {
    query = query.where('isActive', '==', true) as typeof query;
  }

  // COUNSELLOR can only see active employees (no sensitive admin data)
  if (session.role === 'COUNSELLOR') {
    query = query.where('isActive', '==', true) as typeof query;
  }

  const snapshot = await query.get();
  const employees = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ employees });
}

export async function POST(request: NextRequest) {
  // Only ADMIN can create employees
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { email, password, name, phone, role, dailyCallTarget } = body as {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: 'ADMIN' | 'COUNSELLOR';
    dailyCallTarget?: number;
  };

  if (!email || !password || !name || !phone || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create Firebase Auth user
  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: name,
  });

  // Set custom claims for role-based access
  await adminAuth.setCustomUserClaims(userRecord.uid, {
    role,
    employeeId: userRecord.uid,
  });

  // Create Firestore document
  const now = FieldValue.serverTimestamp();
  const employeeData: Omit<Employee, 'id'> = {
    email,
    name,
    phone,
    role,
    isActive: true,
    dailyCallTarget: dailyCallTarget ?? 30,
    createdAt: now as Employee['createdAt'],
    updatedAt: now as Employee['updatedAt'],
  };

  await adminDb.collection(EMPLOYEES_COL).doc(userRecord.uid).set(employeeData);

  return NextResponse.json({ id: userRecord.uid, ...employeeData }, { status: 201 });
}
