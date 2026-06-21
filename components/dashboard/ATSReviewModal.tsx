"use client";

import { useState } from "react";
import { X, FileText, PenTool, Rocket, CheckCircle, Copy, RotateCcw } from "lucide-react";
import { ATSResult } from "@/lib/ats-engine";
import { downloadText, downloadPDF, downloadDOCX } from "@/lib/document-export";

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-zinc-400">Edit your ATS-optimized CV</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetCV}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={() => handleCopy(editedCV)}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadText(editedCV, `${companyName}_${jobTitle}_CV.txt`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    .txt
                  </button>
                  <button
                    onClick={() => downloadPDF(editedCV, `${companyName}_${jobTitle}_CV.pdf`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    .pdf
                  </button>
                  <button
                    onClick={() => downloadDOCX(editedCV, `${companyName}_${jobTitle}_CV.docx`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    .docx
                  </button>
                </div>
              </div>
              <textarea
                value={editedCV}
                onChange={(e) => setEditedCV(e.target.value)}
                className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-zinc-600 resize-none"
                spellCheck={false}
              />
              <p className="text-xs text-zinc-500 text-right">Words: {wordCount(editedCV)}</p>
            </div>
          )}

          {activeTab === "cover" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-zinc-400">Edit your cover letter</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetCoverLetter}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={() => handleCopy(editedCoverLetter)}
                    className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadText(editedCoverLetter, `${companyName}_${jobTitle}_Cover_Letter.txt`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    .txt
                  </button>
                  <button
                    onClick={() => downloadPDF(editedCoverLetter, `${companyName}_${jobTitle}_Cover_Letter.pdf`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    .pdf
                  </button>
                  <button
                    onClick={() => downloadDOCX(editedCoverLetter, `${companyName}_${jobTitle}_Cover_Letter.docx`)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition"
                  >
                    .docx
                  </button>
                </div>
              </div>
              <textarea
                value={editedCoverLetter}
                onChange={(e) => setEditedCoverLetter(e.target.value)}
                className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-zinc-600 resize-none"
                spellCheck={false}
              />
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
