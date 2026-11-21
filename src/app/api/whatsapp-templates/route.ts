/**
 * GET  /api/whatsapp-templates             — List WhatsApp templates (Admin or Counsellor)
 * POST /api/whatsapp-templates             — Create a new WhatsApp template (Admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const TEMPLATES_COL = 'whatsapp_templates';

// Initial starter templates if collection is empty
const INITIAL_TEMPLATES = [
  {
    name: 'Post-Call Prospectus & Course Details',
    category: 'FOLLOW_UP',
    content:
      'Dear {name}, thank you for speaking with us today regarding admissions for {course} at Salem Foundations. Please find our complete curriculum brochure here: https://salemfoundations.org/courses. Feel free to contact me at {counsellorPhone} ({counsellorName}) for any further assistance.',
    isActive: true,
  },
  {
    name: 'Fee Structure & Scholarship Criteria',
    category: 'FEES',
    content:
      'Hello {name}, as discussed, here are the fee structure and scholarship details for {course}: https://salemfoundations.org/fees. Meritorious students can avail up to 50% tuition waiver. Reply to this message if you have any questions. Best regards, {counsellorName}.',
    isActive: true,
  },
  {
    name: 'Campus Visit & Counselling Schedule',
    category: 'CAMPUS',
    content:
      'Dear {name}, we would like to invite you and your parents to visit our Salem Foundations campus for a personal counselling session and facility walkthrough. Our campus is open Mon-Sat, 9 AM - 5 PM. Contact {counsellorName} at {counsellorPhone} to reserve your visit slot.',
    isActive: true,
  },
  {
    name: 'Application Form Link & Deadlines',
    category: 'ADMISSION',
    content:
      'Hi {name}, you can complete your online registration for {course} directly at: https://salemfoundations.org/apply. Early admission closing date is approaching soon. Reach out to {counsellorName} at {counsellorPhone} if you need help with application completion.',
    isActive: true,
  },
];

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('activeOnly') === 'true';

  try {
    const colRef = adminDb.collection(TEMPLATES_COL);
    const snapshot = await colRef.get();

    // If database collection is completely empty, auto-seed with initial templates
    if (snapshot.empty) {
      const batch = adminDb.batch();
      const seeded: Array<Record<string, unknown>> = [];

      for (const tpl of INITIAL_TEMPLATES) {
        const docRef = colRef.doc();
        const data = {
          ...tpl,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        batch.set(docRef, data);
        seeded.push({ id: docRef.id, ...data });
      }

      await batch.commit();

      const templates = activeOnly ? seeded.filter((t) => t.isActive) : seeded;
      return NextResponse.json({ templates });
    }

    let templates: Array<Record<string, unknown>> = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (activeOnly) {
      templates = templates.filter((t) => t.isActive !== false);
    }

    // Sort by createdAt descending
    templates.sort((a, b) => {
      const timeA = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const timeB = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return timeB - timeA;
    });

    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch WhatsApp templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (isErrorResponse(session)) return session;

  // Only admins can create WhatsApp templates
  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: only administrators can create WhatsApp templates' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const content = String(body.content || '').trim();
    const category = String(body.category || 'FOLLOW_UP').trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Template name and message content are required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection(TEMPLATES_COL).doc();
    const templateData = {
      name,
      content,
      category,
      isActive,
      createdBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(templateData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      template: { id: docRef.id, ...templateData },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create WhatsApp template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
