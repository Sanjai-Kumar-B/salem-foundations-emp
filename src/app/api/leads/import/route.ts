/**
 * POST /api/leads/import   — Bulk import leads from CSV/JSON (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

const LEADS_COL = 'leads';

interface LeadImportRow {
  name: string;
  mobile: string;
  email?: string;
  source?: string;
  priority?: string;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { leads }: { leads: LeadImportRow[] } = body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'leads array is required' }, { status: 400 });
  }

  if (leads.length > 500) {
    return NextResponse.json({ error: 'Max 500 leads per import' }, { status: 400 });
  }

  const normalizeMobile = (value: string) => value.replace(/\D/g, '').slice(-10);

  // Read once and dedupe with normalized numbers to avoid 30-item `in` limit issues.
  const existingSnap = await adminDb.collection(LEADS_COL).select('mobile').get();
  const existingMobiles = new Set(
    existingSnap.docs
      .map((d: FirebaseFirestore.QueryDocumentSnapshot) => String(d.data().mobile ?? ''))
      .filter(Boolean)
      .map(normalizeMobile)
  );

  const skipped: string[] = [];
  const now = FieldValue.serverTimestamp();

  // Firestore batch writes (max 500 per batch)
  const batch: WriteBatch = adminDb.batch();
  let added = 0;

  for (const lead of leads) {
    if (!lead.name || !lead.mobile) continue;
    const normalizedMobile = normalizeMobile(lead.mobile);
    if (!normalizedMobile) continue;

    if (existingMobiles.has(normalizedMobile)) {
      skipped.push(normalizedMobile);
      continue;
    }

    existingMobiles.add(normalizedMobile);

    const ref = adminDb.collection(LEADS_COL).doc();
    batch.set(ref, {
      name: lead.name,
      mobile: normalizedMobile,
      email: lead.email ?? null,
      source: lead.source ?? 'BULK',
      priority: lead.priority ?? 'MEDIUM',
      status: 'NEW',
      currentStage: 'NEW',
      createdAt: now,
      updatedAt: now,
    });
    added++;
  }

  await batch.commit();

  return NextResponse.json({ added, skipped: skipped.length, skippedMobiles: skipped });
}
