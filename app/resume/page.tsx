"use client";

import { useState } from "react";
import jsPDF from "jspdf";

export default function ResumeBuilder() {
  const [formData, setFormData] = useState({
    name: "",
    jobTitle: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
    education: "",
    experience: "",
    skills: "",
  });
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const cleanResume = data.resume
        .replace(/```plaintext/g, "")
        .replace(/```/g, "")
        .trim();
      setResume(cleanResume);
    } catch (error) {
      alert("Error generating resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const downloadPDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;           // Reduced from 20
    const contentWidth = pageWidth - margin * 2;
    let y = 15;                  // Reduced from 20

    const primaryColor = [30, 41, 59];

    const addLine = (startY: number) => {
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.2);
      pdf.line(margin, startY, pageWidth - margin, startY);
    };

    const addText = (text: string, fontSize: number = 9, color: number[] = [51, 51, 51], isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = pdf.splitTextToSize(text, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * (fontSize * 0.4) + 1.5; // Tighter line spacing
    };

    const addSectionHeader = (text: string) => {
      y += 3; // Reduced from 4
      pdf.setFontSize(11); // Reduced from 13
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(text.toUpperCase(), margin, y);
      y += 1.5;
      addLine(y);
      y += 4; // Reduced from 6
    };

    const addBulletPoint = (text: string) => {
      pdf.setFontSize(9); // Reduced from 10
      pdf.setTextColor(51, 51, 51);
      pdf.setFont("helvetica", "normal");
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.circle(margin + 1.5, y - 1.1, 0.7, "F"); // Smaller bullet
      const lines = pdf.splitTextToSize(text, contentWidth - 6);
      pdf.text(lines, margin + 5, y);
      y += lines.length * 4 + 1.5; // Tighter spacing
    };

    // Header block
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, pageWidth, 32, "F"); // Reduced from 40
    
    pdf.setFontSize(20); // Reduced from 22
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.text(formData.name || "Your Name", margin, 15);
    
    pdf.setFontSize(10); // Reduced from 11
    pdf.setTextColor(200, 200, 200);
    pdf.setFont("helvetica", "normal");
    pdf.text(formData.jobTitle || "Professional", margin, 22);
    
    const contactY = 29;
    pdf.setFontSize(7.5); // Reduced from 8
    pdf.setTextColor(220, 220, 220);
    
    const contacts = [];
    if (formData.email) contacts.push(formData.email);
    if (formData.phone) contacts.push(formData.phone);
    if (formData.location) contacts.push(formData.location);
    if (formData.linkedin) contacts.push(formData.linkedin);
    
    if (contacts.length > 0) {
      const contactText = contacts.join("  |  ");
      pdf.text(contactText, margin, contactY);
    }

    y = 45; // Reduced from 55

    const lines = resume.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
      if (y > 280) { // Tighter page break threshold (was 270)
        pdf.addPage();
        y = 15;
      }

      const line = lines[i].trim();
      if (!line) {
        y += 1.5; // Reduced from 2
        continue;
      }

      if (line.startsWith("**") && line.endsWith("**")) {
        const sectionName = line.replace(/\*\*/g, "").trim();
        addSectionHeader(sectionName);
        continue;
      }

      const sectionKeywords = ["PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EXPERIENCE", "SKILLS", "EDUCATION", "REFERENCES"];
      const upperLine = line.toUpperCase();
      if (sectionKeywords.some(kw => upperLine.includes(kw)) && line.length < 30) {
        addSectionHeader(line.replace(/\*\*/g, "").trim());
        continue;
      }

      if (line.startsWith("- ") || line.startsWith("• ")) {
        addBulletPoint(line.replace(/^[-•]\s*/, ""));
        continue;
      }

      if (line.includes(" at ") || line.includes(" @ ") || (/\[/.test(line) && /\]/.test(line))) {
        pdf.setFontSize(10); // Reduced from 11
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont("helvetica", "bold");
        const cleanLine = line.replace(/\[.*?\]/g, "").trim();
        const jobLines = pdf.splitTextToSize(cleanLine, contentWidth);
        pdf.text(jobLines, margin, y);
        y += jobLines.length * 4.5 + 1; // Tighter
        continue;
      }

      addText(line, 9, [51, 51, 51], false);
    }

    // NO FOOTER - clean for ATS parsers

    pdf.save(`${formData.name.replace(/\s+/g, "_")}_Resume.pdf`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resume);
    alert("Resume copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-2">AI Resume Builder</h1>
        <p className="text-zinc-500 mb-8">Fill in your details and let AI craft your professional resume.</p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Target Job Title *</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="john@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="+1 555 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
              <input
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="linkedin.com/in/johndoe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="New York, USA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Education *</label>
            <textarea
              name="education"
              value={formData.education}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Bachelor's in Business Administration, NYU, 2020-2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Work Experience *</label>
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Customer Service Representative at TechCorp (2022-Present): Handled 50+ customer inquiries daily, resolved complaints with 95% satisfaction rate..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Skills *</label>
            <textarea
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Customer Service, CRM, Salesforce, Excel, Communication, Problem Solving"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-900 text-white px-8 py-4 rounded-full font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Resume"}
          </button>
        </form>

        {resume && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Resume</h2>
              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="text-sm bg-white border border-zinc-200 px-4 py-2 rounded-full hover:bg-zinc-50 transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={downloadPDF}
                  className="text-sm bg-zinc-900 text-white px-4 py-2 rounded-full hover:bg-zinc-800 transition-colors"
                >
                  Download PDF
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm">
              <div className="prose prose-zinc max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {resume}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}