/**
 * POST /api/leads/import — Bulk import leads from CSV/JSON (admin only)
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
  course?: string;
  district?: string;
  location?: string;
  notes?: string;
}

const BATCH_SIZE = 400; // Safe threshold under Firestore 500 write limit
const IN_QUERY_LIMIT = 30; // Firestore limit for 'in' queries

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (isErrorResponse(session)) return session;

  const body = await request.json();
  const { leads }: { leads: LeadImportRow[] } = body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'leads array is required and must not be empty' }, { status: 400 });
  }

  if (leads.length > 5000) {
    return NextResponse.json({ error: 'Max 5,000 leads per import batch' }, { status: 400 });
  }

  const normalizeMobile = (value: unknown): string | null => {
    if (!value) return null;
    const digits = String(value).replace(/\D/g, '');
    const tenDigits = digits.slice(-10);
    return tenDigits.length === 10 ? tenDigits : null;
  };

  // Pre-filter valid and invalid entries
  const validCandidates: { raw: LeadImportRow; mobile: string }[] = [];
  const invalidRows: { row: number; mobile: string; reason: string }[] = [];
  const batchSeenMobiles = new Set<string>();

  leads.forEach((lead, index) => {
    if (!lead.name || typeof lead.name !== 'string' || !lead.name.trim()) {
      invalidRows.push({ row: index + 1, mobile: String(lead.mobile || ''), reason: 'Missing or empty name' });
      return;
    }
    const cleanMobile = normalizeMobile(lead.mobile);
    if (!cleanMobile) {
      invalidRows.push({ row: index + 1, mobile: String(lead.mobile || ''), reason: 'Invalid phone number format (must be 10 digits)' });
      return;
    }
    if (batchSeenMobiles.has(cleanMobile)) {
      invalidRows.push({ row: index + 1, mobile: cleanMobile, reason: 'Duplicate within uploaded file' });
      return;
    }
    batchSeenMobiles.add(cleanMobile);
    validCandidates.push({ raw: lead, mobile: cleanMobile });
  });

  // Query existing database leads in chunks of 30 to dedupe efficiently without loading full collection
  const existingInDb = new Set<string>();
  const allMobiles = validCandidates.map(c => c.mobile);
  
  for (let i = 0; i < allMobiles.length; i += IN_QUERY_LIMIT) {
    const chunk = allMobiles.slice(i, i + IN_QUERY_LIMIT);
    const snap = await adminDb
      .collection(LEADS_COL)
      .where('mobile', 'in', chunk)
      .select('mobile')
      .get();
    snap.docs.forEach(d => {
      const m = d.data().mobile;
      if (m) existingInDb.add(String(m));
    });
  }

  const leadsToInsert: { raw: LeadImportRow; mobile: string }[] = [];
  const skippedExisting: string[] = [];

  for (const item of validCandidates) {
    if (existingInDb.has(item.mobile)) {
      skippedExisting.push(item.mobile);
    } else {
      leadsToInsert.push(item);
    }
  }

  // Insert in chunked batches
  const now = FieldValue.serverTimestamp();
  let added = 0;

  for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
    const slice = leadsToInsert.slice(i, i + BATCH_SIZE);
    const batch: WriteBatch = adminDb.batch();

    for (const item of slice) {
      const ref = adminDb.collection(LEADS_COL).doc();
      batch.set(ref, {
        name: item.raw.name.trim(),
        mobile: item.mobile,
        email: item.raw.email?.trim() || null,
        source: item.raw.source || 'BULK',
        priority: item.raw.priority || 'MEDIUM',
        status: 'NEW',
        currentStage: 'NEW',
        course: item.raw.course?.trim() || null,
        district: item.raw.district?.trim() || null,
        location: item.raw.location?.trim() || null,
        notes: item.raw.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }

    await batch.commit();
  }

  return NextResponse.json({
    success: true,
    added,
    skipped: skippedExisting.length,
    skippedMobiles: skippedExisting,
    invalidCount: invalidRows.length,
    invalidRows,
  });
}
