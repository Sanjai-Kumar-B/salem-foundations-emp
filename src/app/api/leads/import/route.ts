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

  // Collect existing mobile numbers for duplicate detection
  const mobiles = leads.map((l) => l.mobile).filter(Boolean);
  const existingSnap = await adminDb
    .collection(LEADS_COL)
    .where('mobile', 'in', mobiles.slice(0, 30)) // Firestore `in` limit = 30
    .get();
  const existingMobiles = new Set(existingSnap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data().mobile as string));

  const skipped: string[] = [];
  const now = FieldValue.serverTimestamp();

  // Firestore batch writes (max 500 per batch)
  const batch: WriteBatch = adminDb.batch();
  let added = 0;

  for (const lead of leads) {
    if (!lead.name || !lead.mobile) continue;
    if (existingMobiles.has(lead.mobile)) {
      skipped.push(lead.mobile);
      continue;
    }

    const ref = adminDb.collection(LEADS_COL).doc();
    batch.set(ref, {
      name: lead.name,
      mobile: lead.mobile,
      email: lead.email ?? null,
      source: lead.source ?? 'BULK',
      priority: lead.priority ?? 'MEDIUM',
      currentStage: 'NEW',
      createdAt: now,
      updatedAt: now,
    });
    added++;
  }

  await batch.commit();

  return NextResponse.json({ added, skipped: skipped.length, skippedMobiles: skipped });
}
