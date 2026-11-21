/**
 * PATCH  /api/whatsapp-templates/[id]   — Update a WhatsApp template (Admin only)
 * DELETE /api/whatsapp-templates/[id]   — Delete a WhatsApp template (Admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const TEMPLATES_COL = 'whatsapp_templates';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: only administrators can edit WhatsApp templates' },
      { status: 403 }
    );
  }

  const templateId = (await params).id;
  const docRef = adminDb.collection(TEMPLATES_COL).doc(templateId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'WhatsApp template not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.content !== undefined) updates.content = String(body.content).trim();
    if (body.category !== undefined) updates.category = String(body.category).trim();
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    await docRef.update(updates);

    return NextResponse.json({ success: true, id: templateId, updates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update WhatsApp template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: only administrators can delete WhatsApp templates' },
      { status: 403 }
    );
  }

  const templateId = (await params).id;
  const docRef = adminDb.collection(TEMPLATES_COL).doc(templateId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'WhatsApp template not found' }, { status: 404 });
  }

  try {
    await docRef.delete();
    return NextResponse.json({ success: true, id: templateId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete WhatsApp template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
