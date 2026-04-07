/**
 * POST /api/auth/set-role — Set custom claims (role) for an employee (admin only)
 *
 * After creating an Auth user, the admin calls this to assign role + employeeId.
 * The user must sign out and back in for the new claims to take effect.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';
import type { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { uid, role, employeeId } = body as {
    uid: string;
    role: UserRole;
    employeeId?: string;
  };

  if (!uid || !role) {
    return NextResponse.json({ error: 'uid and role are required' }, { status: 400 });
  }

  if (!['ADMIN', 'COUNSELLOR'].includes(role)) {
    return NextResponse.json({ error: 'role must be ADMIN or COUNSELLOR' }, { status: 400 });
  }

  await adminAuth.setCustomUserClaims(uid, {
    role,
    employeeId: employeeId ?? uid,
  });

  // Revoke existing tokens so new claims take effect immediately on next login
  await adminAuth.revokeRefreshTokens(uid);

  return NextResponse.json({
    success: true,
    message: 'Role set. User must sign in again for changes to take effect.',
  });
}
