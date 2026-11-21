import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AnalyticsReportData {
  dateFilterLabel: string;
  generatedAt: string;
  totals: {
    totalCalls: number;
    connected: number;
    conversions: number;
    avgConnect: number;
    activeCounsellors: number;
    totalLeads: number;
  };
  funnel: {
    new: number;
    contacted: number;
    interested: number;
    converted: number;
  };
  sources: Array<{
    source: string;
    total: number;
    connected: number;
    converted: number;
    conversionRate: number;
  }>;
  staff: Array<{
    name: string;
    email: string;
    totalLeadsAssigned: number;
    totalCalls: number;
    connectedCalls: number;
    conversions: number;
    connectionRate: number;
    conversionRate: number;
  }>;
  insights: string[];
}

/**
 * Convert an image URL to Base64 Data URL for embedding into jsPDF
 */
async function getImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateAnalyticsPdf(data: AnalyticsReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Load logos in parallel
  const [salemLogo, oddmachineLogo] = await Promise.all([
    getImageBase64('/logo_eng.jpg'),
    getImageBase64('/Oddmachine.png'),
  ]);

  // Header Title Bar Background (Deep Slate / Navy)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(margin, 12, pageWidth - margin * 2, 28, 'F');

  // Decorative top accent strip (Salem Blue)
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(margin, 12, pageWidth - margin * 2, 2, 'F');

  // Salem Foundations Logo (Left)
  if (salemLogo) {
    try {
      doc.addImage(salemLogo, 'JPEG', margin + 3, 16, 20, 20);
    } catch {
      // Fallback if image fails
    }
  }

  // Header Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('SALEM FOUNDATIONS', margin + 26, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.text('Admissions & Counselling Performance Report', margin + 26, 29);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text(`Period: ${data.dateFilterLabel}  |  Generated: ${data.generatedAt}`, margin + 26, 35);

  // Oddmachine Logo (Right Corner, smaller size)
  if (oddmachineLogo) {
    try {
      const oddX = pageWidth - margin - 22;
      doc.addImage(oddmachineLogo, 'PNG', oddX, 16, 18, 18);
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Oddmachine', oddX + 9, 36.5, { align: 'center' });
    } catch {
      // Ignore if image fails
    }
  }

  let currentY = 46;

  const getFinalY = () => {
    const docWithAutoTable = doc as unknown as { lastAutoTable?: { finalY: number } };
    return docWithAutoTable.lastAutoTable ? docWithAutoTable.lastAutoTable.finalY : currentY + 30;
  };

  // Section 1: Executive KPI Summary Cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive KPI Summary', margin, currentY);
  currentY += 4;

  const kpis = [
    { label: 'Total Calls', value: String(data.totals.totalCalls), color: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] },
    { label: 'Connected Calls', value: String(data.totals.connected), color: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] },
    { label: 'Conversions', value: String(data.totals.conversions), color: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
    { label: 'Avg Connect Rate', value: `${data.totals.avgConnect}%`, color: [254, 243, 199], border: [253, 230, 138], text: [180, 83, 9] },
    { label: 'Active Counsellors', value: String(data.totals.activeCounsellors), color: [248, 250, 252], border: [226, 232, 240], text: [51, 65, 85] },
  ];

  const cardWidth = (pageWidth - margin * 2 - (kpis.length - 1) * 3) / kpis.length;
  const cardHeight = 16;

  kpis.forEach((kpi, index) => {
    const cardX = margin + index * (cardWidth + 3);
    // Card background
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label.toUpperCase(), cardX + 3, currentY + 5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.value, cardX + 3, currentY + 12);
  });

  currentY += cardHeight + 8;

  // Section 2: Admissions Funnel Conversion
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Admissions & Pipeline Funnel', margin, currentY);
  currentY += 3;

  const totalFunnel = data.totals.totalLeads || 1;
  const funnelRows = [
    ['New Leads', String(data.funnel.new), `${Math.round((data.funnel.new / totalFunnel) * 100)}%`],
    ['Contacted Leads', String(data.funnel.contacted), `${Math.round((data.funnel.contacted / totalFunnel) * 100)}%`],
    ['Interested Prospects', String(data.funnel.interested), `${Math.round((data.funnel.interested / totalFunnel) * 100)}%`],
    ['Confirmed Conversions', String(data.funnel.converted), `${Math.round((data.funnel.converted / totalFunnel) * 100)}%`],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Funnel Stage', 'Lead Count', '% of Total Pipeline']],
    body: funnelRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = getFinalY() + 8;

  // Section 3: Performance by Lead Source
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Performance by Lead Source', margin, currentY);
  currentY += 3;

  const sourceRows = data.sources.map((s) => [
    s.source,
    String(s.total),
    String(s.connected),
    String(s.converted),
    `${s.conversionRate}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Lead Source', 'Total Leads', 'Connected Calls', 'Conversions', 'Conversion Rate']],
    body: sourceRows.length ? sourceRows : [['No data', '0', '0', '0', '0%']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = getFinalY() + 8;

  // Check if we need a page break before Counsellor Performance
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // Section 4: Staff Productivity Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Staff Productivity & Performance Breakdown', margin, currentY);
  currentY += 3;

  const staffRows = data.staff.map((s) => [
    s.name,
    String(s.totalLeadsAssigned),
    String(s.totalCalls),
    String(s.connectedCalls),
    String(s.conversions),
    `${s.connectionRate}%`,
    `${s.conversionRate}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        'Counsellor',
        'Assigned Leads',
        'Calls Made',
        'Connected',
        'Conversions',
        'Connect Rate',
        'Conv. Rate',
      ],
    ],
    body: staffRows.length ? staffRows : [['No counsellors recorded', '0', '0', '0', '0', '0%', '0%']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = getFinalY() + 8;

  // Check if insights fit
  if (currentY > 240) {
    doc.addPage();
    currentY = 16;
  }

  // Section 5: Key Strategic Insights
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Strategic Performance Insights', margin, currentY);
  currentY += 4;

  data.insights.forEach((insight) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`•  ${insight}`, margin + 2, currentY);
    currentY += 4.5;
  });

  // Add Watermark & Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle Watermark in less opacity
    doc.saveGraphicsState();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gStateConstructor = (doc as any).GState;
      if (gStateConstructor && (doc as any).setGState) {
        (doc as any).setGState(new gStateConstructor({ opacity: 0.05 }));
      }
    } catch {
      // Fallback if GState is not available
      doc.setTextColor(240, 240, 245);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(100, 116, 139);
    doc.text('SALEM FOUNDATIONS', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Salem Foundations Admissions System  |  Confidential Institutional MIS Report  |  Powered by Oddmachine',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // Save the PDF file to trigger browser download
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Salem_Foundations_Analytics_Report_${dateStr}.pdf`);
}
