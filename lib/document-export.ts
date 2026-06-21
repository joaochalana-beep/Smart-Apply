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

interface CVSection {
  title: string;
  lines: string[];
}

function parseCV(content: string): {
  name: string;
  title: string;
  contacts: string[];
  sections: CVSection[];
} {
  const lines = content.split("\n").map((l) => l.trim());
  const name = lines[0] || "";
  const contacts = lines[1]
    ? lines[1].split("|").map((s) => s.trim()).filter(Boolean)
    : [];

  const sections: CVSection[] = [];
  let current: CVSection | null = null;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (
      /^[A-Z][A-Z\s&\-]+$/.test(line) &&
      line.length < 40 &&
      !line.startsWith("•") &&
      !line.includes("|")
    ) {
      current = { title: line, lines: [] };
      sections.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  return { name, title: "", contacts, sections };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function downloadCV_PDF(content: string, filename: string, jobTitle?: string) {
  const parsed = parseCV(content);
  const name = parsed.name || "Candidate";
  const title = jobTitle || parsed.title || "Professional";
  const contacts = parsed.contacts;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const primaryColor = [30, 41, 59]; // slate-800
  let y = 15;

  const addPageIfNeeded = (needed = 10) => {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
    }
  };

  const addSectionHeader = (text: string) => {
    addPageIfNeeded(12);
    y += 4;
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(text.toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const addText = (
    text: string,
    fontSize: number = 9,
    isBold: boolean = false,
    color: number[] = [51, 51, 51]
  ) => {
    addPageIfNeeded(fontSize * 0.5);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * (fontSize * 0.4) + 1.5;
  };

  const addBullet = (text: string) => {
    addPageIfNeeded(8);
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    doc.setFont("helvetica", "normal");
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(margin + 1.5, y - 1.1, 0.7, "F");
    const bulletText = text.replace(/^•\s*/, "");
    const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 6);
    doc.text(bulletLines, margin + 5, y);
    y += bulletLines.length * 4 + 1;
  };

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(name, margin, 14);
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.setFont("helvetica", "normal");
  doc.text(title, margin, 21);
  if (contacts.length > 0) {
    doc.setFontSize(7.5);
    doc.text(contacts.join("  |  "), margin, 28);
  }

  y = 42;

  for (const section of parsed.sections) {
    addSectionHeader(section.title);

    for (const line of section.lines) {
      if (line.startsWith("•")) {
        addBullet(line);
      } else if (line.includes("|") && section.title === "EXPERIENCE") {
        const parts = line.split("|").map((s) => s.trim());
        addText(`${parts[0]} | ${parts.slice(1).join(" | ")}`, 9, true);
      } else if (section.title === "EDUCATION" && line.includes("-")) {
        addText(line, 9, false);
      } else {
        addText(line, 9, false);
      }
    }
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
