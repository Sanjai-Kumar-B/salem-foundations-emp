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
  const needsActiveOnly = activeOnly || session.role === 'COUNSELLOR';

  try {
    // Keep the Firestore query index-friendly; order in memory.
    let query: FirebaseFirestore.Query = adminDb.collection(EMPLOYEES_COL);
    if (needsActiveOnly) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.get();
    const employees = snapshot.docs
      .map((doc: FirebaseFirestore.QueryDocumentSnapshot): Record<string, unknown> => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(a['name'] ?? '').localeCompare(String(b['name'] ?? '')));

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('GET /api/employees failed:', error);
    return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 });
  }
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
