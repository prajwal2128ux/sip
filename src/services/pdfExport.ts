/**
 * PlagiCheck - Academic PDF Report Generator
 * Exports a formal, professional PDF plagiarism report using jsPDF
 */

import { jsPDF } from 'jspdf';
import { Analysis, PlagiarismReport, User } from '../types';

export function generateAndDownloadPdf(report: PlagiarismReport, user?: User | null): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Primary Academic Brand Colors
  const navy = [15, 23, 42]; // #0f172a
  const blue = [37, 99, 235]; // #2563eb
  const slate = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc
  const red = [220, 38, 38]; // #dc2626
  const green = [5, 150, 105]; // #059669
  const amber = [217, 119, 6]; // #d97706

  const analysis = report.reportData.analysis;

  // 1. Header Banner
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(margin, y, contentWidth, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 24, 'S');

  // Title & Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('PLAGICHECK', margin + 6, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('ACADEMIC PLAGIARISM & ORIGINALITY REPORT', margin + 6, y + 18);

  // Report Code & Date (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`REPORT ID: ${report.reportCode}`, pageWidth - margin - 6, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  const dateFormatted = new Date(report.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated: ${dateFormatted}`, pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 32;

  // 2. Metadata Section (Author & Document details)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('Document Information', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('Title:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(analysis.title || 'Untitled Document', margin + 24, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('Submitted By:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`${user?.name || 'Dr. Alex Morgan'} (${user?.institution || 'Academic Institution'})`, margin + 24, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('Methodology:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(report.reportData.methodology || 'TF-IDF Vector Space Analysis & N-Gram Shingling', margin + 24, y);
  y += 10;

  // 3. Score Metric Cards
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 22;

  // Card 1: Similarity Score
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(margin, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, cardWidth, cardHeight, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('SIMILARITY SCORE', margin + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const simColor = analysis.similarityPercentage > 35 ? red : analysis.similarityPercentage > 15 ? amber : green;
  doc.setTextColor(simColor[0], simColor[1], simColor[2]);
  doc.text(`${analysis.similarityPercentage}%`, margin + 5, y + 17);

  // Card 2: Originality Score
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(c2X, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(c2X, y, cardWidth, cardHeight, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('ORIGINALITY SCORE', c2X + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(green[0], green[1], green[2]);
  doc.text(`${analysis.originalityPercentage}%`, c2X + 5, y + 17);

  // Card 3: AI / ChatGPT Detection
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(c3X, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(c3X, y, cardWidth, cardHeight, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('AI / CHATGPT PROB', c3X + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const purple = [126, 34, 206];
  doc.setTextColor(purple[0], purple[1], purple[2]);
  doc.text(`${analysis.aiProbabilityPercentage ?? 0}%`, c3X + 5, y + 17);

  // Card 4: Metrics (Words & Risk)
  const c4X = c3X + cardWidth + 3;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(c4X, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(c4X, y, cardWidth, cardHeight, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text('WORDS / RISK', c4X + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`${analysis.wordCount}w · ${analysis.riskLevel}`, c4X + 5, y + 17);

  y += 30;

  // 4. Executive Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('Executive Summary', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  const summaryLines = doc.splitTextToSize(report.summaryText, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.5 + 6;

  // 5. Reference Sources Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`Identified Reference Sources (${report.reportData.sources.length})`, margin, y);
  y += 6;

  if (report.reportData.sources.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text('No matching reference sources exceeded similarity thresholds.', margin, y);
    y += 10;
  } else {
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('Source Name', margin + 3, y + 5);
    doc.text('Match %', margin + contentWidth - 45, y + 5);
    doc.text('Phrases', margin + contentWidth - 18, y + 5);
    y += 9;

    // Table Rows
    report.reportData.sources.slice(0, 5).forEach((src) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const engineTag = src.searchEngine ? ` [${src.searchEngine}]` : '';
      const fullTitle = `${src.sourceName}${engineTag}`;
      const titleTruncated = fullTitle.length > 55 ? fullTitle.slice(0, 52) + '...' : fullTitle;
      doc.text(titleTruncated, margin + 3, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blue[0], blue[1], blue[2]);
      doc.text(`${src.matchPercentage}%`, margin + contentWidth - 45, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.text(`${src.matchedPhrasesCount}`, margin + contentWidth - 15, y);

      y += 6;
    });
    y += 4;
  }

  // 6. Matched Passages Breakdown
  if (y > pageHeight - 45) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('Matched Content Sentences', margin, y);
  y += 6;

  const matchedSpans = report.reportData.matches.filter((m) => m.matchType !== 'ORIGINAL');

  if (matchedSpans.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('All analyzed sentences were evaluated as original text.', margin, y);
    y += 10;
  } else {
    matchedSpans.slice(0, 6).forEach((span, idx) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const tagColor = span.matchType === 'VERBATIM' ? red : amber;
      doc.setTextColor(tagColor[0], tagColor[1], tagColor[2]);
      doc.text(`[${span.matchType} - ${span.similarityScore}% Match]`, margin, y);

      if (span.sourceName) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(slate[0], slate[1], slate[2]);
        doc.text(` Source: ${span.sourceName}`, margin + 42, y);
      }
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const spanLines = doc.splitTextToSize(`"${span.text}"`, contentWidth - 6);
      doc.text(spanLines, margin + 3, y);
      y += spanLines.length * 4 + 4;
    });
  }

  // Footer on final page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text(
    'PlagiCheck Open Source Academic Plagiarism Detection System · Generated for Academic Verification Only',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Trigger browser download
  doc.save(`${report.reportCode}_Plagiarism_Report.pdf`);
}
