import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const OUTPUT_PATH = path.resolve('docs/Salem_Foundations_Documentation.pdf');

// Helper to safely load and convert image to base64
function getBase64Image(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const bitmap = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${bitmap.toString('base64')}`;
    }
  } catch (err) {
    console.warn(`Could not load image ${filePath}:`, err.message);
  }
  return null;
}

const salemLogo = getBase64Image('public/logo_eng.jpg');
const oddmachineLogo = getBase64Image('public/Oddmachine.png');

// Initialize jsPDF document (A4 format)
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 16;
const contentWidth = pageWidth - margin * 2;

let currentY = margin;

function checkPageBreak(requiredHeight) {
  if (currentY + requiredHeight > pageHeight - 20) {
    doc.addPage();
    drawPageHeader();
    currentY = 24;
  }
}

function drawPageHeader() {
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, 8, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('SALEM FOUNDATIONS ADMISSIONS & TELECALLING PORTAL  |  SYSTEM MANUAL', margin + 3, 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL & PROPRIETARY', pageWidth - margin - 3, 13.5, { align: 'right' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, 17, pageWidth - margin, 17);
}

function addHeading1(title) {
  checkPageBreak(18);
  doc.setFillColor(30, 58, 138); // Deep blue banner
  doc.rect(margin, currentY, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 4, currentY + 6.2);
  currentY += 13;
}

function addHeading2(title) {
  checkPageBreak(14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, margin, currentY + 3);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY + 5, margin + 40, currentY + 5);
  currentY += 9;
}

function addHeading3(title) {
  checkPageBreak(10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(title, margin, currentY + 2);
  currentY += 6.5;
}

function addParagraph(text) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const lines = doc.splitTextToSize(text, contentWidth);
  const blockHeight = lines.length * 4.2;
  checkPageBreak(blockHeight + 3);
  doc.text(lines, margin, currentY + 3);
  currentY += blockHeight + 3;
}

function addBullet(bulletText, boldPrefix = '') {
  doc.setFontSize(8.5);
  const indent = 5;
  const bulletWidth = contentWidth - indent;
  const fullText = boldPrefix ? `${boldPrefix}: ${bulletText}` : bulletText;
  const lines = doc.splitTextToSize(fullText, bulletWidth);
  const blockHeight = lines.length * 4;
  checkPageBreak(blockHeight + 2);

  doc.setFillColor(37, 99, 235);
  doc.circle(margin + 2, currentY + 2.5, 0.9, 'F');

  if (boldPrefix) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(boldPrefix + ': ', margin + indent, currentY + 3);
    const prefixWidth = doc.getTextWidth(boldPrefix + ': ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const restLines = doc.splitTextToSize(bulletText, bulletWidth - prefixWidth);
    doc.text(restLines[0] || '', margin + indent + prefixWidth, currentY + 3);
    if (restLines.length > 1) {
      doc.text(restLines.slice(1), margin + indent, currentY + 7);
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(lines, margin + indent, currentY + 3);
  }

  currentY += blockHeight + 2;
}

function addCallout(text, title = 'BEST PRACTICE / TIP') {
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(text, contentWidth - 10);
  const height = lines.length * 3.8 + 8;
  checkPageBreak(height + 4);

  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, height, 1.5, 1.5, 'FD');

  // Left accent bar
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, currentY, 2.5, height, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(title, margin + 5, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 64, 175);
  doc.text(lines, margin + 5, currentY + 8.5);

  currentY += height + 4;
}

function addScreenshot(imagePath, caption, widthMm = 145, heightMm = 75) {
  const b64 = getBase64Image(imagePath);
  if (!b64) {
    console.warn('Screenshot missing:', imagePath);
    return;
  }

  const totalHeight = heightMm + 9;
  checkPageBreak(totalHeight + 3);

  const xPos = margin + (contentWidth - widthMm) / 2;

  // Outer border & shadow effect
  doc.setFillColor(241, 245, 249);
  doc.rect(xPos - 1, currentY - 1, widthMm + 2, heightMm + 2, 'F');

  const ext = path.extname(imagePath).toUpperCase().replace('.', '');
  doc.addImage(b64, ext === 'JPG' ? 'JPEG' : 'PNG', xPos, currentY, widthMm, heightMm);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(xPos, currentY, widthMm, heightMm, 'D');

  // Caption bar
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(caption, pageWidth / 2, currentY + heightMm + 4.5, { align: 'center' });

  currentY += totalHeight + 4;
}

// ==========================================
// 1. COVER PAGE
// ==========================================
function renderCoverPage() {
  // Deep Blue Header Accent
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 85, 'F');

  // Cyan brand bar
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 83, pageWidth, 3, 'F');

  // Logos
  if (salemLogo) {
    doc.addImage(salemLogo, 'JPEG', margin, 18, 38, 38);
  }
  if (oddmachineLogo) {
    doc.addImage(oddmachineLogo, 'PNG', pageWidth - margin - 32, 22, 30, 30);
  }

  // Cover Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text('SALEM FOUNDATIONS', margin, 65);

  doc.setFontSize(13);
  doc.setFontTextColor = (186, 230, 253);
  doc.setTextColor(186, 230, 253);
  doc.text('ADMISSIONS CRM & TELECALLING PORTAL', margin, 73);

  // Document description card
  currentY = 100;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 70, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Complete System Documentation & User Manual', margin + 8, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const desc = doc.splitTextToSize(
    'This official manual covers end-to-end operational instructions for Admissions Directors, System Administrators, and Educational Counsellors. Topics include lead ingestion, automated duplicate resolution, dynamic workload balancing, telecalling console operations, standardized post-call disposition, instant WhatsApp collateral delivery, and executive MIS reporting.',
    contentWidth - 16
  );
  doc.text(desc, margin + 8, currentY + 22);

  // Metadata Table
  const metaY = currentY + 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Document Version:', margin + 8, metaY);
  doc.text('Release Stage:', margin + 8, metaY + 6);
  doc.text('Target Deployment:', margin + 8, metaY + 12);
  doc.text('Technology Architecture:', margin + 8, metaY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('1.0.0 (Production Clean Build)', margin + 48, metaY);
  doc.text('Production Verified & Security Hardened', margin + 48, metaY + 6);
  doc.text('Higher Education Admissions & Multi-Campus Calling', margin + 48, metaY + 12);
  doc.text('Next.js 16 + Cloud Firestore + Firebase Authentication', margin + 48, metaY + 18);

  // Bottom Notice
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential Institutional Documentation — For Internal Staff & Authorized Personnel Only', pageWidth / 2, pageHeight - 16, { align: 'center' });
  doc.text('Salem Foundations © 2026. Powered by Oddmachine.', pageWidth / 2, pageHeight - 11, { align: 'center' });
}

// ==========================================
// BUILD FULL DOCUMENT CONTENT
// ==========================================
console.log('Generating Salem Foundations Documentation PDF...');

// 1. Cover
renderCoverPage();

// 2. Table of Contents & Executive Summary
doc.addPage();
drawPageHeader();
currentY = 24;

addHeading1('1. System Overview & Architecture');
addParagraph(
  'The Salem Foundations Admissions & Telecalling Portal is a modern institutional CRM engineered to manage the complete lifecycle of student admissions inquiries. By merging real-time telephony state tracking with an intelligent Next-Best-Action prioritization engine and dynamic staff workload balancing, the platform ensures that no prospective student lead is neglected while preventing staff burnout.'
);

addHeading2('1.1 Key Architectural Highlights');
addBullet('Full-Stack React & Next.js 16 App Router optimized with server-side API authorization and edge-ready client caching.', 'Modern Framework');
addBullet('Strict enterprise database layer utilizing document collections with transaction-safe updates.', 'Cloud Firestore Engine');
addBullet('Dual-role enforcement (ADMIN and COUNSELLOR) secured via custom user claims and session tokens.', 'Firebase Security');
addBullet('Automatic conversion of 10-digit candidate mobile numbers into valid wa.me URI strings with dynamic tag substitution.', 'WhatsApp Integration');
addBullet('Client-side vector report synthesis embedding Salem Foundations and Oddmachine seals with security watermarking.', 'Branded PDF Reports');

addHeading2('1.2 Technology Stack');
addParagraph('The platform is built on an enterprise web stack: Next.js 16 (Turbopack), React 18, TypeScript 5, Tailwind CSS 3.4, Google Cloud Firestore, Firebase Authentication, jsPDF 4.2, and SheetJS (XLSX).');

addHeading1('2. User Roles & Security Access');
addParagraph('Access to system modules is strictly partitioned between two primary user roles:');
addBullet('Complete administrative control over student inquiries, batch allocation, staff onboarding, analytics, and messaging templates.', 'System Administrator (ADMIN)');
addBullet('Dedicated calling console, active dialer, follow-up scheduler, personal performance counters, and WhatsApp messaging.', 'Educational Counsellor (COUNSELLOR)');

addCallout('Role-based navigation guards block unauthorized route traversal. Any attempt by a counsellor to navigate to /admin routes automatically redirects them back to their home desk.', 'SECURITY & ACCESS CONTROL');

// 3. User Authentication
addHeading1('3. Universal User Authentication');
addParagraph(
  'The system features a universal single sign-on entry point at /login. A 2-second branded splash screen featuring the Oddmachine mark introduces users before presenting the email and password fields.'
);
addScreenshot('docs/screenshots/01-login-page.png', 'Figure 1: Universal Single Sign-On Portal (/login)', 135, 68);

// 4. Admin Portal: Dashboard
addHeading1('4. Administrator Executive Dashboard');
addParagraph(
  'The Executive Dashboard gives admissions leadership a consolidated command center. At a glance, administrators monitor inquiry volume, assignment ratios, calling velocity, and daily conversion success.'
);
addScreenshot('docs/screenshots/03-admin-dashboard.png', 'Figure 2: Executive Dashboard Snapshot & Admissions Funnel', 135, 68);
addBullet('Real-time counters for Total Inquiries, Assigned/Unassigned ratio, and Verified Conversions.', 'Key Metrics');
addBullet('Visual graphical tracking from initial contact to confirmed admission.', 'Admissions Funnel');
addBullet('Live team call totals and talk durations across all counsellors.', 'Staff Productivity');

// 5. Admin Portal: Leads & Import
addHeading1('5. Lead Management & Duplicate Detection');
addParagraph(
  'Under /admin/leads, administrators manage the entire student prospect database. The system supports drag-and-drop ingestion of bulk spreadsheets in both CSV and Microsoft Excel (.xlsx) formats.'
);
addScreenshot('docs/screenshots/04-admin-leads.png', 'Figure 3: Lead Directory, Search, and Filtering Console', 135, 68);
addScreenshot('docs/screenshots/05-admin-leads-import-modal.png', 'Figure 4: Bulk Spreadsheet Ingestion & Duplicate Scanner', 135, 68);
addBullet('The importer automatically scans uploaded phone numbers against existing database entries.', 'Automated Duplicate Detection');
addBullet('Administrators are alerted to duplicates with a side-by-side verification dialog and can remove repeats with one click.', 'Admin Approval Flow');

// 6. Admin Portal: Leads Assignment
addHeading1('6. Leads Assignment Center & Workload Balancing');
addParagraph(
  'The Leads Assignment Center introduces a structured, dual-pane distribution workflow designed to eliminate bias and prevent counsellor fatigue.'
);
addScreenshot('docs/screenshots/06-admin-assignments.png', 'Figure 5: Leads Assignment Center with Dynamic Workload Engine', 135, 68);
addBullet('Multi-student selection on the left; strictly single-counsellor selection on the right.', 'Split-Pane Workflow');
addBullet('Computes team average workload and displays status badges: Available, Balanced, or Overloaded.', 'Dynamic Workload Balancing');
addBullet('Dedicated tab displaying previous allocations with one-click reassignment capability.', 'Assignment History & Reassign');

// 7. Admin Portal: Employee Roster
addHeading1('7. Staff Roster & Employee Management');
addParagraph(
  'Administrators manage staff under /admin/employees. The system records extensive staff profile data including Date of Birth, Date of Joining, and contact information.'
);
addScreenshot('docs/screenshots/07-admin-employees.png', 'Figure 6: Employee List Roster, Status Toggles, and Details Drawer', 135, 68);
addBullet('Calling targets shift dynamically with assigned student volume rather than fixed standard numbers.', 'Workload-Adaptive Targets');
addBullet('One-click Activate/Deactivate toggles to temporarily manage staff queue availability.', 'Status Controls');
addBullet('Permanently deleting an employee automatically releases their assigned students back into the unassigned pool.', 'Safe Cascading Removal');

// 8. Admin Portal: Analytics & PDF Generator
addHeading1('8. Analytics & Branded Institutional PDF Reports');
addParagraph(
  'Under /admin/analytics, administrators evaluate admissions velocity, source attribution, and individual staff productivity. The page includes an automated vector PDF report generator.'
);
addScreenshot('docs/screenshots/08-admin-analytics.png', 'Figure 7: Analytics Dashboard & MIS Report Generation View', 135, 68);
addBullet('One-click generation of multi-page executive MIS reports.', 'Executive PDF Generator');
addBullet('Features Salem Foundations logo on header left, Oddmachine technology mark on right, and a subtle security watermark.', 'Official Branding & Watermark');
addBullet('Covers executive KPIs, pipeline drop-offs, lead source matrices, and counsellor efficiency tables.', 'Complete MIS Summary');

// 9. Admin Portal: WhatsApp Templates
addHeading1('9. WhatsApp Template Authoring & Management');
addParagraph(
  'The WhatsApp Template Manager (/admin/whatsapp) empowers administrators to standardize outbound candidate communications across the institution.'
);
addBullet('Create templates for program brochures, scholarship criteria, fee schedules, and campus visit invitations.', 'Standardized Collateral');
addBullet('Support for {name}, {course}, {location}, {counsellorName}, and {counsellorPhone} tags.', 'Dynamic Personalization');
addBullet('Active switch instantly synchronizes approved templates to all counsellor telecalling desks.', 'Instant Sync');

// 10. Counsellor Desk: Dashboard & Schedule
addHeading1('10. Counsellor Desk & Scheduled Calls');
addParagraph(
  'Counsellors operate within an intuitive, distraction-free environment designed for rapid student engagement and systematic follow-up management.'
);
addScreenshot('docs/screenshots/10-counsellor-dashboard.png', 'Figure 8: Counsellor Daily Performance Dashboard', 135, 68);
addScreenshot('docs/screenshots/12-counsellor-todays-calls.png', 'Figure 9: Today Scheduled Calls & Categorized Queues', 135, 68);
addBullet('Overdue callbacks from earlier days are highlighted in bold red badges to prevent student drop-off.', 'Overdue Follow-up Priority');
addBullet('Tracks daily calls completed against the counsellor dynamic assigned target.', 'Workload Target Progress');

// 11. Counsellor Desk: Workspace & Dialer
addHeading1('11. Telecalling Workspace & Dialer Console');
addParagraph(
  'The Telecalling Workspace (/counsellor/workspace) is the engine room of admissions telecalling. It presents candidates in prioritized order using the mathematical Next-Best-Action algorithm.'
);
addScreenshot('docs/screenshots/11-counsellor-workspace.png', 'Figure 10: Telecalling Workspace with Live Dialer & Candidate Profile', 135, 68);
addBullet('Automatically serves overdue follow-ups first, today callbacks second, and high-priority fresh leads third.', 'Next-Best-Action Algorithm');
addBullet('Clicking Call launches the device dialer or softphone via tel: protocol.', 'Device Dialer Integration');
addBullet('Built-in stopwatch tracks duration from connection to completion.', 'Live Elapsed Call Timer');

// 12. Counsellor Desk: Outcome & WhatsApp
addHeading1('12. Post-Call Outcome & Optional WhatsApp Collateral');
addParagraph(
  'When a phone call concludes, the counsellor immediately enters the post-call disposition workflow.'
);
addBullet('Six standardized dispositions: Interested, Call Later, No Response, Not Interested, Wrong Number, and Converted.', 'Strict Disposition Classification');
addBullet('Interested and Call Later outcomes mandate setting a follow-up callback date using presets or custom datetime.', 'Mandatory Follow-Up');
addBullet('Optional section embedded directly in the post-call screen allowing 1-click personalized WhatsApp messaging.', 'Optional WhatsApp Collateral');
addBullet('Choosing a template shows a live personalized preview with candidate name and course.', 'Live Personalization Preview');

// 13. Counsellor Desk: Follow-ups & Discovery Pool
addHeading1('13. Follow-ups Management & New Leads Pool');
addParagraph(
  'Counsellors manage upcoming calendar callbacks and discover fresh uncontacted prospects through specialized views.'
);
addScreenshot('docs/screenshots/13-counsellor-follow-ups.png', 'Figure 11: Follow-up Pipeline & Callback Calendar', 135, 68);
addScreenshot('docs/screenshots/14-counsellor-new-leads.png', 'Figure 12: New Leads Discovery Pool for Fresh Outreach', 135, 68);

// 14. Dedicated Profiles & Session Sign Out
addHeading1('14. Profile Management & Secure Sign Out');
addParagraph(
  'Both administrative and counselling portals feature dedicated Profile pages (/admin/profile and /counsellor/profile). In compliance with enterprise security requirements, direct sign-out triggers have been relocated from general sidebars exclusively into these authenticated profile views.'
);
addBullet('Displays full employee credentials, registered email, assigned role, and unique system UID.', 'Profile Identity');
addBullet('Prominent red Sign Out button terminating Firebase session tokens cleanly.', 'Secure Session Sign Out');

// 15. FAQ & Regulatory Rules
addHeading1('15. Compliance Policies & Frequently Asked Questions');
addHeading2('15.1 Calling Hours Compliance (09:00 - 18:00)');
addParagraph(
  'To maintain high institutional standards and prevent nuisance complaints, the telecalling engine strictly restricts outbound candidate dialing between 09:00 AM and 06:00 PM (18:00). Dialing attempts outside these hours are flagged and prevented.'
);

addHeading2('15.2 Disposition Retry Backoff Engine');
addParagraph(
  'When a candidate call is logged as No Response, the system automatically applies an exponential retry backoff (Attempt 1: +2h, Attempt 2: +6h, Attempt 3: +24h). After 3 consecutive unacknowledged attempts, the lead is safely exhausted to preserve counsellor bandwidth.'
);

addHeading2('15.3 Frequently Asked Questions');
addBullet('Yes. Simply click the Import Leads button and upload your Excel sheet. The parser automatically extracts candidate names, phone numbers, and course interests.', 'Can we import .xlsx files?');
addBullet('The system identifies matching phone numbers before import and prompts the administrator with a confirmation screen to discard duplicates.', 'How are duplicate leads handled?');
addBullet('Selecting a template pre-fills candidate details and opens WhatsApp Web or your desktop app in a new tab upon saving.', 'How does WhatsApp collateral work?');

// Add page numbers and institutional footers across all content pages
const totalPages = doc.internal.getNumberOfPages();
for (let i = 2; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Salem Foundations Admissions Portal  |  System Documentation & User Manual', margin, pageHeight - 8);
  doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
}

// Save PDF
const pdfData = doc.output('arraybuffer');
fs.writeFileSync(OUTPUT_PATH, Buffer.from(pdfData));
console.log(`✅ Documentation PDF successfully created: ${OUTPUT_PATH} (${totalPages} pages)`);
