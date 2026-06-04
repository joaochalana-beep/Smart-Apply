"use client";

import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const resumeRef = useRef<HTMLDivElement>(null);

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
      // Clean up markdown formatting
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

  const downloadPDF = async () => {
    if (!resumeRef.current) return;
    
    const canvas = await html2canvas(resumeRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
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
            
            <div 
              ref={resumeRef}
              className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm"
            >
              <div className="prose prose-zinc max-w-none">
                {resume.split("\n").map((line, index) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <h2 key={index} className="text-xl font-bold mt-6 mb-3">{line.replace(/\*\*/g, "")}</h2>;
                  }
                  if (line.startsWith("- ")) {
                    return <li key={index} className="ml-4 mb-1">{line.replace("- ", "")}</li>;
                  }
                  if (line.trim() === "") {
                    return <div key={index} className="h-2"></div>;
                  }
                  return <p key={index} className="mb-2 leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}