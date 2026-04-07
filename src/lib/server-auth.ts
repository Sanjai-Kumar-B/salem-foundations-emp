/**
 * Server-side Auth for Employee Management
 * ==========================================
 * Verifies Firebase ID tokens sent by logged-in employees.
 * Extracts role (ADMIN | COUNSELLOR) from custom claims.
 *
 * Auth Flow:
 *  1. Employee signs in via Firebase Auth (client-side, email+password)
 *  2. Client gets idToken = await user.getIdToken()
 *  3. Client sends:  Authorization: Bearer <idToken>
 *  4. API routes call verifyEmployeeToken(request) to get verified identity
 *  5. Writes are performed by Admin SDK — never client SDK
 */
import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';
import type { UserRole } from '@/types';

export interface EmployeeSession {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string; // Firestore employee document ID (set as custom claim)
}

/**
 * Extract and verify the Firebase ID token from the Authorization header.
 * Returns the verified employee session or null if the token is invalid/missing.
 *
 * Usage in API route:
 *   const session = await verifyEmployeeToken(request);
 *   if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function verifyEmployeeToken(
  request: NextRequest
): Promise<EmployeeSession | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const idToken = authHeader.slice(7);
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      name: decoded.name ?? decoded.email ?? '',
      role: (decoded.role as UserRole) ?? 'COUNSELLOR',
      employeeId: decoded.employeeId as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Require an authenticated employee with any role.
 * Returns 401 response if not authenticated.
 */
export async function requireAuth(
  request: NextRequest
): Promise<EmployeeSession | Response> {
  const session = await verifyEmployeeToken(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

/**
 * Require an authenticated ADMIN employee.
 * Returns 401/403 response if not authenticated or not admin.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<EmployeeSession | Response> {
  const session = await verifyEmployeeToken(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (session.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

/** Type guard: check if something is a Response (error) vs a session */
export function isErrorResponse(value: EmployeeSession | Response): value is Response {
  return value instanceof Response;
}
