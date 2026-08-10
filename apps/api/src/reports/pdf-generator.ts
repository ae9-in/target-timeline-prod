import PDFDocument from 'pdfkit';
import * as fs from 'fs';

interface ReportData {
  generatedAt: Date;
  counts: { GREEN: number; AMBER: number; RED: number };
  verticalBreakdown: Record<
    string,
    { GREEN: number; AMBER: number; RED: number }
  >;
  targets: Array<{
    name: string;
    vertical: string;
    owner: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    ragStatus: string;
    progress: number;
  }>;
}

export function generatePdfReport(
  data: ReportData,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      let currentY = 40;

      // Helper for page breaks
      const checkPageBreak = (heightNeeded: number, onNewPage?: () => void) => {
        if (currentY + heightNeeded > 780) {
          doc.addPage();
          currentY = 45;
          if (onNewPage) {
            onNewPage();
          }
          return true;
        }
        return false;
      };

      // ─── 1. Header Banner ──────────────────────────────────────────────────
      doc.rect(40, currentY, 515, 60).fill('#0f111a');

      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Targets & Timelines — Leadership RAG Report', 55, currentY + 22);

      const dateStr = new Date(data.generatedAt).toLocaleDateString();
      doc
        .fillColor('#9ca3af')
        .fontSize(10)
        .font('Helvetica')
        .text(dateStr, 480, currentY + 25, { width: 60, align: 'right' });

      currentY += 85;

      // ─── 2. Stats Summary Cards ───────────────────────────────────────────
      const cardWidth = 161;
      const cardHeight = 75;
      const cardGap = 16;

      const drawCard = (
        x: number,
        y: number,
        label: string,
        val: number,
        color: string,
        bgAccent: string,
      ) => {
        // Card Background
        doc.rect(x, y, cardWidth, cardHeight).fill('#ffffff');
        doc.rect(x, y, cardWidth, cardHeight).stroke('#e5e7eb');
        // Top accent line
        doc.rect(x, y, cardWidth, 4).fill(color);

        doc
          .fillColor('#6b7280')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(label, x + 15, y + 15);

        doc
          .fillColor(color)
          .fontSize(24)
          .font('Helvetica-Bold')
          .text(String(val), x + 15, y + 28);

        doc
          .fillColor('#9ca3af')
          .fontSize(8)
          .font('Helvetica')
          .text('TARGETS', x + 15, y + 55);
      };

      drawCard(
        40,
        currentY,
        'ON TRACK',
        data.counts.GREEN,
        '#10b981',
        '#d1fae5',
      );
      drawCard(
        40 + cardWidth + cardGap,
        currentY,
        'AT RISK',
        data.counts.AMBER,
        '#f59e0b',
        '#fef3c7',
      );
      drawCard(
        40 + (cardWidth + cardGap) * 2,
        currentY,
        'OFF TRACK',
        data.counts.RED,
        '#ef4444',
        '#fee2e2',
      );

      currentY += 105;

      // ─── 3. Department Performance Table ───────────────────────────────
      checkPageBreak(120);

      doc
        .fillColor('#1f2937')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Department Performance Metrics', 40, currentY);
      currentY += 18;

      const drawDeptTableHeader = () => {
        doc.rect(40, currentY, 515, 20).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
        doc.text('Vertical / Department', 50, currentY + 6);
        doc.text('Green', 260, currentY + 6, { width: 80, align: 'center' });
        doc.text('Amber', 355, currentY + 6, { width: 80, align: 'center' });
        doc.text('Red', 450, currentY + 6, { width: 80, align: 'center' });
        currentY += 20;
      };

      drawDeptTableHeader();

      const deptRows = Object.entries(data.verticalBreakdown);
      if (deptRows.length === 0) {
        doc
          .fillColor('#9ca3af')
          .fontSize(9)
          .font('Helvetica-Oblique')
          .text('No active departments configured.', 50, currentY + 6);
        currentY += 20;
      } else {
        deptRows.forEach(([dept, counts]) => {
          checkPageBreak(20, drawDeptTableHeader);

          // Draw bottom border
          doc
            .moveTo(40, currentY + 20)
            .lineTo(555, currentY + 20)
            .strokeColor('#e5e7eb')
            .lineWidth(0.5)
            .stroke();

          doc
            .fillColor('#1f2937')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(dept, 50, currentY + 6);

          doc
            .fillColor('#10b981')
            .font('Helvetica-Bold')
            .text(String(counts.GREEN), 260, currentY + 6, {
              width: 80,
              align: 'center',
            });
          doc
            .fillColor('#f59e0b')
            .font('Helvetica-Bold')
            .text(String(counts.AMBER), 355, currentY + 6, {
              width: 80,
              align: 'center',
            });
          doc
            .fillColor('#ef4444')
            .font('Helvetica-Bold')
            .text(String(counts.RED), 450, currentY + 6, {
              width: 80,
              align: 'center',
            });

          currentY += 20;
        });
      }

      currentY += 35;

      // ─── 4. Detailed Targets Breakdown Table ───────────────────────────
      checkPageBreak(120);

      doc
        .fillColor('#1f2937')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Target Breakdown Detailed View', 40, currentY);
      currentY += 18;

      const drawTargetTableHeader = () => {
        doc.rect(40, currentY, 515, 20).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
        doc.text('Target Name', 50, currentY + 6);
        doc.text('Vertical', 220, currentY + 6);
        doc.text('Owner', 310, currentY + 6);
        doc.text('Current Progress', 390, currentY + 6);
        doc.text('Status', 505, currentY + 6);
        currentY += 20;
      };

      drawTargetTableHeader();

      if (data.targets.length === 0) {
        doc
          .fillColor('#9ca3af')
          .fontSize(9)
          .font('Helvetica-Oblique')
          .text('No targets available in this report.', 50, currentY + 6);
        currentY += 20;
      } else {
        data.targets.forEach((t) => {
          checkPageBreak(24, drawTargetTableHeader);

          // Draw bottom border
          doc
            .moveTo(40, currentY + 24)
            .lineTo(555, currentY + 24)
            .strokeColor('#e5e7eb')
            .lineWidth(0.5)
            .stroke();

          // Target Name
          doc
            .fillColor('#1f2937')
            .fontSize(9)
            .font('Helvetica')
            .text(t.name, 50, currentY + 8, { width: 160, lineBreak: false });
          // Vertical
          doc.fillColor('#4b5563').text(t.vertical, 220, currentY + 8);
          // Owner
          doc.fillColor('#4b5563').text(t.owner, 310, currentY + 8);
          // Progress
          const progText = `${t.currentValue} / ${t.targetValue} ${t.unit} (${t.progress}%)`;
          doc
            .fillColor('#1f2937')
            .fontSize(8)
            .text(progText, 390, currentY + 8, { width: 110 });

          // RAG Status Badge
          let badgeBg = '#fee2e2';
          let badgeText = '#991b1b';
          if (t.ragStatus === 'GREEN') {
            badgeBg = '#d1fae5';
            badgeText = '#065f46';
          } else if (t.ragStatus === 'AMBER') {
            badgeBg = '#fef3c7';
            badgeText = '#92400e';
          }

          const badgeX = 505;
          const badgeY = currentY + 5;
          const badgeW = 45;
          const badgeH = 14;

          doc.rect(badgeX, badgeY, badgeW, badgeH).fill(badgeBg);
          doc
            .fillColor(badgeText)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(t.ragStatus, badgeX, badgeY + 3, {
              width: badgeW,
              align: 'center',
            });

          currentY += 24;
        });
      }

      // ─── 5. Comparative Analysis Section ───────────────────────────────
      // Add Comparative Analysis Page
      doc.addPage();
      currentY = 40;

      // Page header
      doc.rect(40, currentY, 515, 36).fill('#0f111a');
      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(
          'APPENDIX: TESTING OBSERVATIONS & GAP ANALYSIS',
          55,
          currentY + 13,
        );
      currentY += 50;

      doc
        .fillColor('#4b5563')
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .text(
          'Comparative audit of the Target Timeline application against industry standard ERP/CRM platforms (Zoho, Jira, Monday, Odoo, Dynamics 365), detailing observed bugs/limitations and recommended resolutions.',
          40,
          currentY,
          { width: 515, lineGap: 2 },
        );
      currentY += 35;

      const drawComparisonTableHeader = () => {
        doc.rect(40, currentY, 515, 20).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
        doc.text('Feature', 45, currentY + 6, { width: 85 });
        doc.text('Target Timeline (Current)', 135, currentY + 6, {
          width: 135,
        });
        doc.text('Standard ERP/CRM Systems', 275, currentY + 6, { width: 140 });
        doc.text('Recommendation', 420, currentY + 6, { width: 135 });

        doc
          .moveTo(40, currentY + 20)
          .lineTo(555, currentY + 20)
          .strokeColor('#d1d5db')
          .lineWidth(1)
          .stroke();
        currentY += 20;
      };

      drawComparisonTableHeader();

      const comparisonRows = [
        {
          feature: 'User Role Management',
          current:
            'Viewer permissions are unclear (Viewer can access Department module)',
          standard:
            'Strict Role-Based Access Control (RBAC) with Admin, Manager, Viewer permissions',
          recommendation: 'Restrict viewer access based on assigned roles.',
        },
        {
          feature: 'Data Validation',
          current:
            'Code field accepts 4 characters though specification says 3',
          standard: 'Strong input validation with mandatory format checks',
          recommendation: 'Implement frontend and backend validation.',
        },
        {
          feature: 'Export Function',
          current: 'Export functionality not working',
          standard: 'Export to Excel/PDF/CSV available in most systems',
          recommendation:
            'Fix export module and provide multiple export formats.',
        },
        {
          feature: 'Dropdown Selection',
          current: 'Location dropdown cannot be selected after updating',
          standard: 'Auto-refresh and dynamic dropdown loading',
          recommendation: 'Refresh dropdown after update without page reload.',
        },
        {
          feature: 'Dashboard Metrics',
          current: 'Baseline value does not update correctly',
          standard: 'Real-time dashboard calculations',
          recommendation: 'Refresh KPIs immediately after data changes.',
        },
        {
          feature: 'Alert Management',
          current: 'Resolved targets still appear in Alerts and Risk Log',
          standard: 'Alerts automatically disappear after resolution',
          recommendation: 'Synchronize alert status with task status.',
        },
        {
          feature: 'User Experience',
          current: 'Some modules require multiple refreshes',
          standard: 'Smooth navigation with instant UI updates',
          recommendation:
            'Improve frontend state management and responsiveness.',
        },
        {
          feature: 'Error Handling',
          current: 'Limited validation and user feedback',
          standard: 'Clear error messages and success notifications',
          recommendation:
            'Display meaningful validation and confirmation messages.',
        },
        {
          feature: 'Search & Filters',
          current: 'Basic filtering',
          standard: 'Advanced filters, global search, sorting, saved filters',
          recommendation: 'Add multi-filter and search functionality.',
        },
        {
          feature: 'Audit Trail',
          current: 'Limited visibility',
          standard: 'Complete activity history and change logs',
          recommendation:
            'Maintain logs for updates, deletions, and user actions.',
        },
        {
          feature: 'Performance',
          current: 'Minor UI delays during updates',
          standard: 'Optimized loading with caching and lazy loading',
          recommendation: 'Optimize API response time and frontend rendering.',
        },
      ];

      comparisonRows.forEach((item, index) => {
        doc.font('Helvetica-Bold').fontSize(8);
        const fHeight = doc.heightOfString(item.feature, { width: 85 });

        doc.font('Helvetica').fontSize(8);
        const cHeight = doc.heightOfString(item.current, { width: 135 });
        const sHeight = doc.heightOfString(item.standard, { width: 140 });

        doc.font('Helvetica-Bold').fontSize(8);
        const rHeight = doc.heightOfString(item.recommendation, { width: 135 });

        const contentHeight = Math.max(fHeight, cHeight, sHeight, rHeight);
        const rowHeight = contentHeight + 14;

        checkPageBreak(rowHeight, () => {
          drawComparisonTableHeader();
        });

        if (index % 2 === 1) {
          doc.rect(40, currentY, 515, rowHeight).fill('#fafafa');
        }

        doc
          .moveTo(40, currentY + rowHeight)
          .lineTo(555, currentY + rowHeight)
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .stroke();

        doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(8);
        doc.text(item.feature, 45, currentY + 7, { width: 85 });

        doc.fillColor('#4b5563').font('Helvetica').fontSize(8);
        doc.text(item.current, 135, currentY + 7, { width: 135 });
        doc.text(item.standard, 275, currentY + 7, { width: 140 });

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8);
        doc.text(item.recommendation, 420, currentY + 7, { width: 135 });

        currentY += rowHeight;
      });

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
