"use client";

import { useState } from "react";

export default function ResumeBuilder() {
  const [formData, setFormData] = useState({
    name: "",
    jobTitle: "",
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
      setResume(data.resume);
    } catch (error) {
      alert("Error generating resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-2">AI Resume Builder</h1>
        <p className="text-zinc-500 mb-8">Fill in your details and let AI craft your professional resume.</p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-12">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
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
            <label className="block text-sm font-medium mb-2">Target Job Title</label>
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
            <label className="block text-sm font-medium mb-2">Education</label>
            <textarea
              name="education"
              value={formData.education}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Bachelor's in Computer Science, University of Lisbon, 2020-2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Work Experience</label>
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Software Intern at TechCorp (2023-2024): Built React components, improved page load speed by 40%..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Skills</label>
            <textarea
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="React, TypeScript, Node.js, Python, SQL, Git, Agile"
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
          <div className="bg-zinc-50 rounded-2xl p-8 border border-zinc-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Resume</h2>
              <button
                onClick={() => navigator.clipboard.writeText(resume)}
                className="text-sm bg-white border border-zinc-200 px-4 py-2 rounded-full hover:bg-zinc-50 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 font-mono">
              {resume}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}