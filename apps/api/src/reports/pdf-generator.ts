import PDFDocument from 'pdfkit';
import * as fs from 'fs';

interface ReportData {
  generatedAt: Date;
  counts: { GREEN: number; AMBER: number; RED: number };
  verticalBreakdown: Record<string, { GREEN: number; AMBER: number; RED: number }>;
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

export function generatePdfReport(data: ReportData, outputPath: string): Promise<void> {
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
      
      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Targets & Timelines — Leadership RAG Report', 55, currentY + 22);

      const dateStr = new Date(data.generatedAt).toLocaleDateString();
      doc.fillColor('#9ca3af')
         .fontSize(10)
         .font('Helvetica')
         .text(dateStr, 480, currentY + 25, { width: 60, align: 'right' });

      currentY += 85;

      // ─── 2. Stats Summary Cards ───────────────────────────────────────────
      const cardWidth = 161;
      const cardHeight = 75;
      const cardGap = 16;

      const drawCard = (x: number, y: number, label: string, val: number, color: string, bgAccent: string) => {
        // Card Background
        doc.rect(x, y, cardWidth, cardHeight).fill('#ffffff');
        doc.rect(x, y, cardWidth, cardHeight).stroke('#e5e7eb');
        // Top accent line
        doc.rect(x, y, cardWidth, 4).fill(color);
        
        doc.fillColor('#6b7280')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(label, x + 15, y + 15);

        doc.fillColor(color)
           .fontSize(24)
           .font('Helvetica-Bold')
           .text(String(val), x + 15, y + 28);

        doc.fillColor('#9ca3af')
           .fontSize(8)
           .font('Helvetica')
           .text('TARGETS', x + 15, y + 55);
      };

      drawCard(40, currentY, 'ON TRACK', data.counts.GREEN, '#10b981', '#d1fae5');
      drawCard(40 + cardWidth + cardGap, currentY, 'AT RISK', data.counts.AMBER, '#f59e0b', '#fef3c7');
      drawCard(40 + (cardWidth + cardGap) * 2, currentY, 'OFF TRACK', data.counts.RED, '#ef4444', '#fee2e2');

      currentY += 105;

      // ─── 3. Department Performance Table ───────────────────────────────
      checkPageBreak(120);
      
      doc.fillColor('#1f2937')
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
        doc.fillColor('#9ca3af').fontSize(9).font('Helvetica-Oblique').text('No active departments configured.', 50, currentY + 6);
        currentY += 20;
      } else {
        deptRows.forEach(([dept, counts]) => {
          checkPageBreak(20, drawDeptTableHeader);
          
          // Draw bottom border
          doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

          doc.fillColor('#1f2937').fontSize(9).font('Helvetica-Bold').text(dept, 50, currentY + 6);
          
          doc.fillColor('#10b981').font('Helvetica-Bold').text(String(counts.GREEN), 260, currentY + 6, { width: 80, align: 'center' });
          doc.fillColor('#f59e0b').font('Helvetica-Bold').text(String(counts.AMBER), 355, currentY + 6, { width: 80, align: 'center' });
          doc.fillColor('#ef4444').font('Helvetica-Bold').text(String(counts.RED), 450, currentY + 6, { width: 80, align: 'center' });
          
          currentY += 20;
        });
      }

      currentY += 35;

      // ─── 4. Detailed Targets Breakdown Table ───────────────────────────
      checkPageBreak(120);

      doc.fillColor('#1f2937')
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
        doc.fillColor('#9ca3af').fontSize(9).font('Helvetica-Oblique').text('No targets available in this report.', 50, currentY + 6);
        currentY += 20;
      } else {
        data.targets.forEach((t) => {
          checkPageBreak(24, drawTargetTableHeader);

          // Draw bottom border
          doc.moveTo(40, currentY + 24).lineTo(555, currentY + 24).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

          // Target Name
          doc.fillColor('#1f2937').fontSize(9).font('Helvetica').text(t.name, 50, currentY + 8, { width: 160, lineBreak: false });
          // Vertical
          doc.fillColor('#4b5563').text(t.vertical, 220, currentY + 8);
          // Owner
          doc.fillColor('#4b5563').text(t.owner, 310, currentY + 8);
          // Progress
          const progText = `${t.currentValue} / ${t.targetValue} ${t.unit} (${t.progress}%)`;
          doc.fillColor('#1f2937').fontSize(8).text(progText, 390, currentY + 8, { width: 110 });

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
          doc.fillColor(badgeText)
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(t.ragStatus, badgeX, badgeY + 3, { width: badgeW, align: 'center' });

          currentY += 24;
        });
      }

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
