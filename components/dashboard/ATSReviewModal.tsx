"use client";

import { useState } from "react";
import { X, FileText, PenTool, Rocket, CheckCircle, Copy, RotateCcw, Edit3, Eye } from "lucide-react";
import { ATSResult } from "@/lib/ats-engine";
import { downloadText, downloadPDF, downloadDOCX, downloadCV_PDF } from "@/lib/document-export";

interface ATSReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
  result: ATSResult;
  onSubmit: (editedCV: string, editedCoverLetter: string) => void;
  submitting?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function progressColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "_").substring(0, 40);
}

interface CVSection {
  title: string;
  lines: string[];
}

function parseCV(cvText: string): {
  name: string;
  contacts: string[];
  sections: CVSection[];
} {
  const lines = cvText.split("\n").map((l) => l.trim());
  const name = lines[0] || "";
  const contacts = lines[1]
    ? lines[1].split("|").map((s) => s.trim()).filter(Boolean)
    : [];

  const sections: CVSection[] = [];
  let current: CVSection | null = null;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Section header: all-caps, no bullet, no pipe, short
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

  return { name, contacts, sections };
}

function FormattedCV({ cvText, jobTitle }: { cvText: string; jobTitle: string }) {
  const { name, contacts, sections } = parseCV(cvText);

  return (
    <div className="bg-white rounded-xl overflow-hidden text-zinc-900 shadow-sm border border-zinc-200">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-6 text-white">
        <h3 className="text-2xl font-bold">{name || "Your Name"}</h3>
        <p className="text-slate-300 text-sm mt-1">{jobTitle || "Professional"}</p>
        {contacts.length > 0 && (
          <p className="text-slate-400 text-xs mt-2">{contacts.join("  |  ")}</p>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {sections.map((section, idx) => (
          <div key={idx}>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              {section.title}
            </h4>
            <div className="space-y-1.5">
              {section.lines.map((line, lidx) => {
                if (line.startsWith("•")) {
                  return (
                    <div key={lidx} className="flex gap-2 text-sm text-zinc-700">
                      <span className="text-slate-500 mt-1.5">•</span>
                      <span>{line.replace(/^•\s*/, "")}</span>
                    </div>
                  );
                }
                // Experience header line: Role | Company | Duration
                if (line.includes("|") && !line.includes(":") && section.title === "EXPERIENCE") {
                  const parts = line.split("|").map((s) => s.trim());
                  return (
                    <div key={lidx} className="text-sm">
                      <span className="font-semibold text-zinc-900">{parts[0]}</span>
                      {parts[1] && <span className="text-zinc-600"> · {parts[1]}</span>}
                      {parts[2] && <span className="text-zinc-500 text-xs ml-2">{parts[2]}</span>}
                    </div>
                  );
                }
                // Education line: Degree - School, Year
                if (section.title === "EDUCATION" && line.includes("-")) {
                  const [degree, rest] = line.split("-").map((s) => s.trim());
                  return (
                    <div key={lidx} className="text-sm text-zinc-700">
                      <span className="font-medium text-zinc-900">{degree}</span>
                      {rest && <span> — {rest}</span>}
                    </div>
                  );
                }
                return (
                  <p key={lidx} className="text-sm text-zinc-700 leading-relaxed">
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormattedCoverLetter({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="bg-white rounded-xl p-8 text-zinc-900 shadow-sm border border-zinc-200">
      <div className="space-y-4">
        {paragraphs.map((para, idx) => {
          const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
          return (
            <p key={idx} className="text-sm leading-7 text-zinc-800">
              {lines.map((line, lineIdx) => (
                <span key={lineIdx}>
                  {line}
                  {lineIdx < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function ATSReviewModal({
  isOpen,
  onClose,
  jobTitle,
  companyName,
  result,
  onSubmit,
  submitting = false,
}: ATSReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"score" | "cv" | "cover">("score");
  const [editedCV, setEditedCV] = useState(result.cv);
  const [editedCoverLetter, setEditedCoverLetter] = useState(result.coverLetter);
  const [cvEditMode, setCvEditMode] = useState(false);
  const [coverEditMode, setCoverEditMode] = useState(false);

  if (!isOpen) return null;

  const matched = result.matchedKeywords.slice(0, 14);
  const missing = result.missingKeywords.slice(0, 6);
  const totalJobKw = Math.max(1, result.matchedKeywords.length + result.missingKeywords.length);
  const matchedCount = result.matchedKeywords.length;
  const matchPercent = Math.round((matchedCount / totalJobKw) * 100);

  const realGaps = [
    ...result.gapAnalysis.missingRequiredSkills.slice(0, 4),
    ...result.gapAnalysis.missingCertifications.slice(0, 3),
    ...result.gapAnalysis.missingLanguages.slice(0, 3),
  ];

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleResetCV() {
    setEditedCV(result.cv);
  }

  function handleResetCoverLetter() {
    setEditedCoverLetter(result.coverLetter);
  }

  const cvFilenameBase = `${sanitizeFilename(companyName)}_${sanitizeFilename(jobTitle)}`;
  const coverFilenameBase = `${sanitizeFilename(companyName)}_${sanitizeFilename(jobTitle)}_Cover_Letter`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Review Your Application</h2>
            <p className="text-sm text-zinc-400">
              {jobTitle} at {companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {[
            { id: "score", label: "ATS Score", icon: CheckCircle },
            { id: "cv", label: "CV", icon: FileText },
            { id: "cover", label: "Cover Letter", icon: PenTool },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "score" | "cv" | "cover")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-zinc-800 text-white border-b-2 border-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "score" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className={`text-5xl font-bold ${scoreColor(result.atsScore)}`}>
                  {result.atsScore}/100
                </p>
                <p className="text-zinc-400 text-sm mt-1">ATS Optimization Score</p>
              </div>

              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${progressColor(result.atsScore)} transition-all duration-500`}
                  style={{ width: `${result.atsScore}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase">Technical Skills</p>
                  <p className="text-lg font-bold text-white">{result.scoreBreakdown.technicalSkills}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase">Soft Skills</p>
                  <p className="text-lg font-bold text-white">{result.scoreBreakdown.softSkills}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase">Experience</p>
                  <p className="text-lg font-bold text-white">{result.scoreBreakdown.experience}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase">Education</p>
                  <p className="text-lg font-bold text-white">{result.scoreBreakdown.education}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase">Languages</p>
                  <p className="text-lg font-bold text-white">{result.scoreBreakdown.languages}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase">Certifications</p>
                  <p className="text-lg font-bold text-white">{result.scoreBreakdown.certifications}%</p>
                </div>
              </div>

              <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-2">
                  ✅ Keywords Matched: {matchedCount}/{totalJobKw} ({matchPercent}%)
                </p>
                <p className="text-xs text-zinc-400">
                  {matched.join(" • ") || "No keyword matches found"}
                </p>
              </div>

              {realGaps.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-900/40 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-400 mb-2">⚠️ Gaps to Address</p>
                  <ul className="text-xs text-amber-200/80 space-y-1">
                    {realGaps.map((m, i) => (
                      <li key={i}>• {m} — add if you have it</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-900/40 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-400 mb-2">💡 Tips to reach 95%+</p>
                <ul className="text-xs text-blue-200/80 space-y-1">
                  <li>• Quantify one more achievement in your experience</li>
                  <li>• Add any online training related to missing skills</li>
                  <li>• Mirror exact phrasing from the job post</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "cv" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-400 truncate">
                  {cvEditMode ? "Edit your ATS-optimized CV" : "Your ATS-optimized CV"}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setCvEditMode((v) => !v)}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                    title={cvEditMode ? "Preview" : "Edit"}
                  >
                    {cvEditMode ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                    {cvEditMode ? "Preview" : "Edit"}
                  </button>
                  <button
                    onClick={handleResetCV}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                    title="Reset"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={() => handleCopy(editedCV)}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadText(editedCV, `${cvFilenameBase}_CV.txt`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                  >
                    .txt
                  </button>
                  <button
                    onClick={() => downloadCV_PDF(editedCV, `${cvFilenameBase}_CV.pdf`, jobTitle)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                  >
                    .pdf
                  </button>
                  <button
                    onClick={() => downloadDOCX(editedCV, `${cvFilenameBase}_CV.docx`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                  >
                    .docx
                  </button>
                </div>
              </div>

              {cvEditMode ? (
                <textarea
                  value={editedCV}
                  onChange={(e) => setEditedCV(e.target.value)}
                  className="w-full h-[28rem] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-zinc-600 resize-none"
                  spellCheck={false}
                />
              ) : (
                <div className="max-h-[28rem] overflow-y-auto rounded-xl">
                  <FormattedCV cvText={editedCV} jobTitle={jobTitle} />
                </div>
              )}

              <p className="text-xs text-zinc-500 text-right">Words: {wordCount(editedCV)}</p>
            </div>
          )}

          {activeTab === "cover" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-400 truncate">
                  {coverEditMode ? "Edit your cover letter" : "Your cover letter"}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setCoverEditMode((v) => !v)}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                    title={coverEditMode ? "Preview" : "Edit"}
                  >
                    {coverEditMode ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                    {coverEditMode ? "Preview" : "Edit"}
                  </button>
                  <button
                    onClick={handleResetCoverLetter}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                    title="Reset"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={() => handleCopy(editedCoverLetter)}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadText(editedCoverLetter, `${coverFilenameBase}.txt`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                  >
                    .txt
                  </button>
                  <button
                    onClick={() => downloadPDF(editedCoverLetter, `${coverFilenameBase}.pdf`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                  >
                    .pdf
                  </button>
                  <button
                    onClick={() => downloadDOCX(editedCoverLetter, `${coverFilenameBase}.docx`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded transition"
                  >
                    .docx
                  </button>
                </div>
              </div>

              {coverEditMode ? (
                <textarea
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                  className="w-full h-[28rem] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-zinc-600 resize-none"
                  spellCheck={false}
                />
              ) : (
                <div className="max-h-[28rem] overflow-y-auto rounded-xl">
                  <FormattedCoverLetter text={editedCoverLetter} />
                </div>
              )}

              <p className="text-xs text-zinc-500 text-right">Words: {wordCount(editedCoverLetter)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(editedCV, editedCoverLetter)}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {submitting ? (
              <>Submitting...</>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Submit Application
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
