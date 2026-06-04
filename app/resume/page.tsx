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
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Color scheme - professional dark blue
    const primaryColor = [30, 41, 59]; // Dark slate
    const secondaryColor = [71, 85, 105]; // Slate
    const accentColor = [15, 23, 42]; // Darker slate

    // Helper functions
    const addLine = (startY: number) => {
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, startY, pageWidth - margin, startY);
    };

    const addText = (text: string, fontSize: number = 10, color: number[] = [51, 51, 51], isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = pdf.splitTextToSize(text, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * (fontSize * 0.45) + 2;
    };

    const addSectionHeader = (text: string) => {
      y += 4;
      pdf.setFontSize(13);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(text.toUpperCase(), margin, y);
      y += 2;
      addLine(y);
      y += 6;
    };

    const addBulletPoint = (text: string) => {
      pdf.setFontSize(10);
      pdf.setTextColor(51, 51, 51);
      pdf.setFont("helvetica", "normal");

      // Draw bullet
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.circle(margin + 1.5, y - 1.2, 0.8, "F");

      const lines = pdf.splitTextToSize(text, contentWidth - 8);
      pdf.text(lines, margin + 6, y);
      y += lines.length * 4.5 + 2;
    };

    // HEADER - Name and Contact
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, pageWidth, 40, "F");
    
    // Name
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.text(formData.name || "Your Name", margin, 18);
    
    // Job Title
    pdf.setFontSize(11);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont("helvetica", "normal");
    pdf.text(formData.jobTitle || "Professional", margin, 26);
    
    // Contact info bar - using plain text labels
    const contactY = 34;
    pdf.setFontSize(8);
    pdf.setTextColor(220, 220, 220);
    
    const contacts = [];
    if (formData.email) contacts.push("Email: " + formData.email);
    if (formData.phone) contacts.push("Phone: " + formData.phone);
    if (formData.location) contacts.push("Location: " + formData.location);
    if (formData.linkedin) contacts.push("LinkedIn: " + formData.linkedin);
    
    if (contacts.length > 0) {
      const contactText = contacts.join("  |  ");
      pdf.text(contactText, margin, contactY);
    }

    y = 55;

    // Parse resume sections
    const lines = resume.split("\n");
    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      const line = lines[i].trim();
      if (!line) {
        y += 2;
        continue;
      }

      // Detect section headers (lines with ** or all caps)
      if (line.startsWith("**") && line.endsWith("**")) {
        const sectionName = line.replace(/\*\*/g, "").trim();
        addSectionHeader(sectionName);
        currentSection = sectionName;
        continue;
      }

      // Detect section headers by common words
      const sectionKeywords = ["PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EXPERIENCE", "SKILLS", "EDUCATION", "REFERENCES"];
      const upperLine = line.toUpperCase();
      if (sectionKeywords.some(kw => upperLine.includes(kw)) && line.length < 30) {
        addSectionHeader(line.replace(/\*\*/g, "").trim());
        continue;
      }

      // Bullet points
      if (line.startsWith("- ") || line.startsWith("• ")) {
        addBulletPoint(line.replace(/^[-•]\s*/, ""));
        continue;
      }

      // Job title + company + dates pattern
      if (line.includes(" at ") || line.includes(" @ ") || (/\[/.test(line) && /\]/.test(line))) {
        pdf.setFontSize(11);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont("helvetica", "bold");
        const cleanLine = line.replace(/\[.*?\]/g, "").trim();
        const jobLines = pdf.splitTextToSize(cleanLine, contentWidth);
        pdf.text(jobLines, margin, y);
        y += jobLines.length * 5 + 1;
        continue;
      }

      // Regular paragraph
      addText(line, 10, [51, 51, 51], false);
    }

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont("helvetica", "italic");
      pdf.text("Generated by ApplyFlow - applyflow.vercel.app", margin, 287);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, 287);
    }

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
                placeholder="João Chalana"
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
                placeholder="Customer Service Specialist"
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
                placeholder="joao@email.com"
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
                placeholder="+351 912 345 678"
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
                placeholder="linkedin.com/in/joaochalana"
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
                placeholder="Lisbon, Portugal"
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
              placeholder="Bachelor's in Communication Sciences, FCSH NOVA, 2020-2024"
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
              placeholder="KYC Verification Specialist at Sumsub (2023-Present): Conducted identity verification, managed customer interactions for Binance and Paybis..."
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
              placeholder="Customer Support, KYC Verification, Zendesk, Excel, Fraud Detection, Compliance Operations"
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