import PDFDocument from 'pdfkit';
import { pool } from './database';
import path from 'path';
import fs from 'fs';

export async function generatePdfReport(scanId: string): Promise<Buffer> {
  const { rows } = await pool.query('SELECT * FROM scans WHERE id = $1', [scanId]);
  const scan = rows[0];

  if (!scan) throw new Error('Scan not found');

  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(25).text('SOC Platform Scan Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Scan ID: ${scan.id}`);
  doc.text(`User ID: ${scan.user_id}`);
  doc.text(`Content Type: ${scan.content_type}`);
  doc.text(`Verdict: ${scan.verdict}`);
  doc.text(`Risk Score: ${scan.risk_score}`);
  doc.text(`Confidence: ${scan.confidence}`);
  doc.text(`Attack Type: ${scan.attack_type}`);
  doc.text(`Scanned At: ${scan.created_at}`);
  doc.moveDown();

  doc.text('Summary:', { underline: true });
  doc.fontSize(10).text(scan.summary);
  doc.moveDown();

  doc.text('Recommendation:', { underline: true });
  doc.text(scan.recommendation);
  if (scan.redirect_chain && scan.redirect_chain.length > 0) {
    doc.moveDown();
    doc.text('Redirect Chain:', { underline: true });
    (scan.redirect_chain as string[]).forEach((url, i) => doc.text(`${i+1}. ${url}`));
  }
  if (scan.sandbox_result?.screenshotPath) {
    const screenshotFull = scan.sandbox_result.screenshotPath;
    if (fs.existsSync(screenshotFull)) {
      doc.moveDown();
      doc.text('Sandbox Screenshot:', { underline: true });
      doc.image(screenshotFull, { fit: [400, 300] });
    }
  }
  doc.end();
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
