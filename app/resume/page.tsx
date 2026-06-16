"use client";

import { useState } from "react";
import jsPDF from "jspdf";

type ExperienceEntry = {
  company: string;
  role: string;
  duration: string;
  location: string;
  achievements: string[];
};

type SkillCategory = {
  category: string;
  skills: string[];
};

type FormData = {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  summary: string;
  targetJobDescription: string;
  experiences: ExperienceEntry[];
  skills: SkillCategory[];
  education: string;
  certifications: string;
  languages: string;
};

const DEFAULT_EXPERIENCE: ExperienceEntry = {
  company: "",
  role: "",
  duration: "",
  location: "",
  achievements: [""],
};

const DEFAULT_SKILLS: SkillCategory = {
  category: "Technical",
  skills: [""],
};

const SKILL_CATEGORIES = [
  "Technical",
  "Tools & Software",
  "Compliance & Regulatory",
  "Languages",
  "Soft Skills",
  "Industry Knowledge",
  "Certifications",
];

const ACHIEVEMENT_PROMPTS = [
  "What was your main responsibility?",
  "What metric did you improve? (e.g., reduced response time by 20%)",
  "What tool or process did you use?",
  "What was the business impact?",
];

export default function ResumeBuilder() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    jobTitle: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
    summary: "",
    targetJobDescription: "",
    experiences: [{ ...DEFAULT_EXPERIENCE }],
    skills: [{ ...DEFAULT_SKILLS }],
    education: "",
    certifications: "",
    languages: "",
  });
  const [result, setResult] = useState<{
    resume: string;
    coverLetter: string;
    atsScore: number;
    improvements: string[];
    keywords: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "coverLetter">("resume");

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateExperience = (
    index: number,
    field: keyof ExperienceEntry,
    value: any
  ) => {
    const updated = [...formData.experiences];
    updated[index] = { ...updated[index], [field]: value };
    updateField("experiences", updated);
  };

  const updateAchievement = (
    expIndex: number,
    achIndex: number,
    value: string
  ) => {
    const updated = [...formData.experiences];
    updated[expIndex].achievements[achIndex] = value;
    updateField("experiences", updated);
  };

  const addAchievement = (expIndex: number) => {
    const updated = [...formData.experiences];
    updated[expIndex].achievements.push("");
    updateField("experiences", updated);
  };

  const removeAchievement = (expIndex: number, achIndex: number) => {
    const updated = [...formData.experiences];
    updated[expIndex].achievements.splice(achIndex, 1);
    updateField("experiences", updated);
  };

  const addExperience = () => {
    updateField("experiences", [
      ...formData.experiences,
      { ...DEFAULT_EXPERIENCE },
    ]);
  };

  const removeExperience = (index: number) => {
    const updated = formData.experiences.filter((_, i) => i !== index);
    updateField("experiences", updated);
  };

  const updateSkill = (catIndex: number, skillIndex: number, value: string) => {
    const updated = [...formData.skills];
    updated[catIndex].skills[skillIndex] = value;
    updateField("skills", updated);
  };

  const addSkill = (catIndex: number) => {
    const updated = [...formData.skills];
    updated[catIndex].skills.push("");
    updateField("skills", updated);
  };

  const removeSkill = (catIndex: number, skillIndex: number) => {
    const updated = [...formData.skills];
    updated[catIndex].skills.splice(skillIndex, 1);
    updateField("skills", updated);
  };

  const updateSkillCategory = (catIndex: number, category: string) => {
    const updated = [...formData.skills];
    updated[catIndex].category = category;
    updateField("skills", updated);
  };

  const addSkillCategory = () => {
    updateField("skills", [
      ...formData.skills,
      { category: "Technical", skills: [""] },
    ]);
  };

  const removeSkillCategory = (index: number) => {
    const updated = formData.skills.filter((_, i) => i !== index);
    updateField("skills", updated);
  };

  const extractPDFText = async (file: File): Promise<string> => {
    const pdfjs = await import("pdfjs-dist");
    
    // Use local worker file (same as your working upload-cv page)
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);

    try {
      let text = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        text = await extractPDFText(file);
      } else {
        // For TXT files
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("Could not extract text from file");
      }

      const res = await fetch("/api/extract-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Extracted CV data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Properly map experiences with fallback
      const extractedExperiences = data.experiences?.map((exp: any) => ({
        company: exp.company || "",
        role: exp.role || "",
        duration: exp.duration || "",
        location: exp.location || "",
        achievements: Array.isArray(exp.achievements) && exp.achievements.length > 0 
          ? exp.achievements 
          : [""],
      })) || [{ ...DEFAULT_EXPERIENCE }];

      // Properly map skills with fallback
      const extractedSkills = data.skills?.map((cat: any) => ({
        category: cat.category || "Technical",
        skills: Array.isArray(cat.skills) && cat.skills.length > 0
          ? cat.skills
          : [""],
      })) || [{ ...DEFAULT_SKILLS }];

      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        jobTitle: data.jobTitle || prev.jobTitle,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        linkedin: data.linkedin || prev.linkedin,
        location: data.location || prev.location,
        summary: data.summary || prev.summary,
        experiences: extractedExperiences,
        skills: extractedSkills,
        education: data.education || prev.education,
        certifications: data.certifications || prev.certifications,
        languages: data.languages || prev.languages,
      }));

      setStep(1);
    } catch (err: any) {
      console.error("CV extraction error:", err);
      alert(`Failed to extract CV: ${err.message || "Unknown error"}. Please fill in manually.`);
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setResult(data);
      setStep(6);
    } catch (error) {
      alert("Error generating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (content: string, filename: string) => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    const primaryColor = [30, 41, 59];

    const addSectionHeader = (text: string) => {
      y += 3;
      pdf.setFontSize(11);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(text.toUpperCase(), margin, y);
      y += 2;
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const addText = (
      text: string,
      fontSize: number = 9,
      isBold: boolean = false,
      color: number[] = [51, 51, 51]
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = pdf.splitTextToSize(text, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * (fontSize * 0.4) + 2;
    };

    // Header
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, pageWidth, 32, "F");
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.text(formData.name || "Your Name", margin, 14);
    pdf.setFontSize(10);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont("helvetica", "normal");
    pdf.text(formData.jobTitle || "Professional", margin, 21);
    const contacts = [
      formData.email,
      formData.phone,
      formData.location,
      formData.linkedin,
    ].filter(Boolean);
    if (contacts.length > 0) {
      pdf.setFontSize(7.5);
      pdf.text(contacts.join("  |  "), margin, 28);
    }

    y = 42;

    const lines = content.split("\n");
    for (const line of lines) {
      if (y > 280) {
        pdf.addPage();
        y = 15;
      }
      const trimmed = line.trim();
      if (!trimmed) {
        y += 2;
        continue;
      }
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        addSectionHeader(trimmed.replace(/\*\*/g, ""));
        continue;
      }
      if (trimmed.startsWith("- ")) {
        pdf.setFontSize(9);
        pdf.setTextColor(51, 51, 51);
        pdf.setFont("helvetica", "normal");
        pdf.setFillColor(
          primaryColor[0],
          primaryColor[1],
          primaryColor[2]
        );
        pdf.circle(margin + 1.5, y - 1.1, 0.7, "F");
        const bulletText = trimmed.replace(/^-+\s*/, "");
        const bulletLines = pdf.splitTextToSize(
          bulletText,
          contentWidth - 6
        );
        pdf.text(bulletLines, margin + 5, y);
        y += bulletLines.length * 4 + 1.5;
        continue;
      }
      addText(trimmed, 9, false);
    }

    pdf.save(filename);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <div
          key={s}
          className={`flex items-center gap-2 ${s > step ? "opacity-40" : ""}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s === step
                ? "bg-zinc-900 text-white"
                : s < step
                ? "bg-zinc-300 text-zinc-700"
                : "bg-zinc-100 text-zinc-400 border border-zinc-200"
            }`}
          >
            {s < step ? "✓" : s === 0 ? "↑" : s}
          </div>
          {s < 5 && (
            <div
              className={`w-8 h-0.5 ${
                s < step ? "bg-zinc-300" : "bg-zinc-100"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6 text-center">
      <h2 className="text-xl font-semibold text-zinc-900">Upload Your Existing CV</h2>
      <p className="text-zinc-600">
        We'll extract your information automatically. You can edit everything
        afterward.
      </p>

      <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-12 hover:border-zinc-500 transition cursor-pointer">
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={handleCVUpload}
          className="hidden"
          id="cv-upload"
        />
        <label htmlFor="cv-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">📄</div>
          <p className="font-medium text-zinc-900">Click to upload your CV</p>
          <p className="text-sm text-zinc-600 mt-1">PDF or TXT</p>
        </label>
      </div>

      <button
        onClick={() => setStep(1)}
        className="text-zinc-600 hover:text-zinc-900 text-sm font-medium"
      >
        Skip upload — start from scratch →
      </button>

      {extracting && (
        <div className="text-zinc-800">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full mr-2"></div>
          Extracting your information...
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">Personal Information</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Full Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Target Job Title *</label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => updateField("jobTitle", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="Software Engineer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="john@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="+1 555 123 4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">LinkedIn</label>
          <input
            type="url"
            value={formData.linkedin}
            onChange={(e) => updateField("linkedin", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="linkedin.com/in/johndoe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => updateField("location", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="New York, USA"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-zinc-700">Professional Summary (optional)</label>
        <textarea
          value={formData.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
          placeholder="Brief overview of your career (2-3 sentences). Leave blank for AI to generate."
        />
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setStep(0)}
          className="text-zinc-700 px-6 py-3 rounded-full font-medium hover:bg-zinc-100"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(2)}
          className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800"
        >
          Next: Target Job →
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">Target Job Description</h2>
      <p className="text-zinc-600 text-sm">
        Paste the job description you're applying for. Our AI will extract
        keywords and tailor your CV to match what recruiters are looking for.
      </p>
      <textarea
        value={formData.targetJobDescription}
        onChange={(e) => updateField("targetJobDescription", e.target.value)}
        rows={12}
        className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
        placeholder="Paste the full job description here...&#10;&#10;Example:&#10;We are seeking a Customer Support Specialist to join our fintech team...&#10;Requirements:&#10;- 2+ years in customer support&#10;- Experience with KYC/AML&#10;- Fluent English&#10;..."
      />
      <div className="flex justify-between">
        <button
          onClick={() => setStep(1)}
          className="text-zinc-700 px-6 py-3 rounded-full font-medium hover:bg-zinc-100"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800"
        >
          Next: Experience →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">Work Experience</h2>
      <p className="text-zinc-600 text-sm">
        Add each role. Focus on achievements with numbers — this is what ATS
        systems and recruiters scan for first.
      </p>
      {formData.experiences.map((exp, expIndex) => (
        <div
          key={expIndex}
          className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-zinc-800">Experience {expIndex + 1}</h3>
            {formData.experiences.length > 1 && (
              <button
                onClick={() => removeExperience(expIndex)}
                className="text-red-500 text-sm hover:text-red-700 font-medium"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              value={exp.company}
              onChange={(e) =>
                updateExperience(expIndex, "company", e.target.value)
              }
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
              placeholder="Company Name"
            />
            <input
              type="text"
              value={exp.role}
              onChange={(e) =>
                updateExperience(expIndex, "role", e.target.value)
              }
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
              placeholder="Your Role"
            />
            <input
              type="text"
              value={exp.duration}
              onChange={(e) =>
                updateExperience(expIndex, "duration", e.target.value)
              }
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
              placeholder="Jan 2022 - Dec 2023"
            />
            <input
              type="text"
              value={exp.location}
              onChange={(e) =>
                updateExperience(expIndex, "location", e.target.value)
              }
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
              placeholder="City, Country (optional)"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">Key Achievements</label>
            {exp.achievements.map((ach, achIndex) => (
              <div key={achIndex} className="flex gap-2">
                <input
                  type="text"
                  value={ach}
                  onChange={(e) =>
                    updateAchievement(expIndex, achIndex, e.target.value)
                  }
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm text-zinc-900 placeholder:text-zinc-400"
                  placeholder={
                    ACHIEVEMENT_PROMPTS[achIndex % ACHIEVEMENT_PROMPTS.length]
                  }
                />
                {exp.achievements.length > 1 && (
                  <button
                    onClick={() => removeAchievement(expIndex, achIndex)}
                    className="text-red-400 hover:text-red-600 px-2 font-medium"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addAchievement(expIndex)}
              className="text-sm text-zinc-600 hover:text-zinc-900 font-medium"
            >
              + Add achievement
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addExperience}
        className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-zinc-500 hover:text-zinc-800 font-medium"
      >
        + Add Another Experience
      </button>
      <div className="flex justify-between">
        <button
          onClick={() => setStep(2)}
          className="text-zinc-700 px-6 py-3 rounded-full font-medium hover:bg-zinc-100"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(4)}
          className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800"
        >
          Next: Skills →
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">Skills & Competencies</h2>
      <p className="text-zinc-600 text-sm">
        Group skills by category. This helps ATS systems parse your
        competencies correctly.
      </p>
      {formData.skills.map((cat, catIndex) => (
        <div
          key={catIndex}
          className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <select
              value={cat.category}
              onChange={(e) =>
                updateSkillCategory(catIndex, e.target.value)
              }
              className="px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm font-medium text-zinc-900 bg-white"
            >
              {SKILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {formData.skills.length > 1 && (
              <button
                onClick={() => removeSkillCategory(catIndex)}
                className="text-red-500 text-sm hover:text-red-700 font-medium"
              >
                Remove Category
              </button>
            )}
          </div>
          <div className="space-y-2">
            {cat.skills.map((skill, skillIndex) => (
              <div key={skillIndex} className="flex gap-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) =>
                    updateSkill(catIndex, skillIndex, e.target.value)
                  }
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm text-zinc-900 placeholder:text-zinc-400"
                  placeholder="e.g., React, Python, KYC, SQL..."
                />
                {cat.skills.length > 1 && (
                  <button
                    onClick={() => removeSkill(catIndex, skillIndex)}
                    className="text-red-400 hover:text-red-600 px-2 font-medium"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addSkill(catIndex)}
              className="text-sm text-zinc-600 hover:text-zinc-900 font-medium"
            >
              + Add skill
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addSkillCategory}
        className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-zinc-500 hover:text-zinc-800 font-medium"
      >
        + Add Another Category
      </button>
      <div className="flex justify-between">
        <button
          onClick={() => setStep(3)}
          className="text-zinc-700 px-6 py-3 rounded-full font-medium hover:bg-zinc-100"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(5)}
          className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800"
        >
          Next: Education →
        </button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">Education & Certifications</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">Education</label>
          <textarea
            value={formData.education}
            onChange={(e) => updateField("education", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="Bachelor of Science in Computer Science&#10;University of Example, 2018-2022"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">
            Certifications (optional)
          </label>
          <textarea
            value={formData.certifications}
            onChange={(e) => updateField("certifications", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="AWS Certified Solutions Architect, 2023&#10;Google Analytics Certification, 2022"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">
            Languages (optional)
          </label>
          <input
            type="text"
            value={formData.languages}
            onChange={(e) => updateField("languages", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-400"
            placeholder="English (Native), Spanish (Fluent), French (Conversational)"
          />
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setStep(4)}
          className="text-zinc-700 px-6 py-3 rounded-full font-medium hover:bg-zinc-100"
        >
          ← Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate CV + Cover Letter ✨"}
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900">Your Application Package</h2>
          <p className="text-zinc-600">
            ATS Score: {result.atsScore}/100 — {getScoreLabel(result.atsScore)}
          </p>
        </div>

        {/* ATS Score Card */}
        <div
          className={`rounded-2xl border p-6 ${getScoreColor(
            result.atsScore
          )}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium opacity-75">ATS Score</p>
              <p className="text-3xl font-bold">{result.atsScore}/100</p>
            </div>
            <div className="text-5xl font-bold opacity-20">
              {result.atsScore}
            </div>
          </div>

          {result.improvements.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">💡 Improvements:</p>
              <ul className="space-y-1 text-sm">
                {result.improvements.map((imp, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.keywords.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                🔑 Matched Keywords from Job Description:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-full text-xs font-medium bg-white/50 border border-current/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab("resume")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "resume"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Resume
          </button>
          <button
            onClick={() => setActiveTab("coverLetter")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === "coverLetter"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Cover Letter
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-800">
            {activeTab === "resume"
              ? result.resume
              : result.coverLetter}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() =>
              downloadPDF(
                activeTab === "resume"
                  ? result.resume
                  : result.coverLetter,
                `SmartApply_${activeTab === "resume" ? "Resume" : "CoverLetter"}_${formData.name.replace(/\s+/g, "_")}.pdf`
              )
            }
            className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800"
          >
            Download as PDF
          </button>
          <button
            onClick={() => setStep(0)}
            className="px-6 py-3 rounded-full font-medium border border-zinc-300 hover:bg-zinc-50 text-zinc-700"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderUploadStep();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderResults();
      default:
        return renderUploadStep();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            AI Resume Builder
          </h1>
          <p className="text-zinc-600">
            Generate an ATS-optimized resume and cover letter tailored to any
            job.
          </p>
        </div>

        {step < 6 && renderStepIndicator()}

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}