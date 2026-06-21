// Utilities to export generated CV/cover letter as PDF and DOCX-like documents.

import { jsPDF } from "jspdf";

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPDF(content: string, filename: string) {
  const doc = new jsPDF();
  const clean = content.replace(/\r/g, "");
  const lines = clean.split("\n");
  let y = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

  doc.setFont("helvetica");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      y += 4;
      continue;
    }
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    const isHeading = line.toUpperCase() === line && line.length > 2 && line.length < 40;
    if (isHeading) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      y += 3;
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
    }
    const split = doc.splitTextToSize(line, maxWidth);
    doc.text(split, margin, y);
    y += isHeading ? 8 : 5;
  }
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function downloadDOCX(content: string, filename: string) {
  // Minimal HTML-based document that Microsoft Word and most word processors can open.
  const html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${filename}</title>
<style>
body { font-family: Arial, Calibri, sans-serif; font-size: 11pt; line-height: 1.4; color: #000; }
h1 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; }
h2 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; border-bottom: 1pt solid #ccc; }
p { margin: 4pt 0; }
ul { margin: 4pt 0; padding-left: 20pt; }
li { margin: 2pt 0; }
</style>
</head>
<body>
${escapeHtml(content)
  .split("\n")
  .map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "<p>&nbsp;</p>";
    if (/^[A-Z\s&]+$/.test(trimmed) && trimmed.length < 40) {
      return `<h2>${trimmed}</h2>`;
    }
    if (trimmed.startsWith("• ")) {
      return `<ul><li>${trimmed.slice(2)}</li></ul>`;
    }
    return `<p>${trimmed}</p>`;
  })
  .join("\n")}
</body>
</html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".doc") || filename.endsWith(".docx") ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
