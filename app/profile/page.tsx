"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfile(data || {});
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setProfile(data);
      alert("Profile saved!");
    } catch (err) {
      alert("Failed to save profile");
    }
    setSaving(false);
  }

  function updateField(field: string, value: string) {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  }

  // Parse JSON fields for display
  function parseJSON(field: string) {
    try {
      return JSON.parse(profile?.[field] || "[]");
    } catch {
      return [];
    }
  }

  function updateJSONField(field: string, index: number, key: string, value: string) {
    const items = parseJSON(field);
    items[index] = { ...items[index], [key]: value };
    updateField(field, JSON.stringify(items));
  }

  function addJSONItem(field: string, template: any) {
    const items = parseJSON(field);
    items.push(template);
    updateField(field, JSON.stringify(items));
  }

  function removeJSONItem(field: string, index: number) {
    const items = parseJSON(field);
    items.splice(index, 1);
    updateField(field, JSON.stringify(items));
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white p-10">Loading...</div>;

  const experience = parseJSON("experience");
  const education = parseJSON("education");

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                value={profile?.full_name || ""}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={profile?.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Phone</label>
              <input
                type="text"
                value={profile?.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Location</label>
              <input
                type="text"
                value={profile?.location || ""}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">LinkedIn</label>
            <input
              type="text"
              value={profile?.linkedin || ""}
              onChange={(e) => updateField("linkedin", e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Skills (comma-separated)</label>
            <textarea
              value={profile?.skills || ""}
              onChange={(e) => updateField("skills", e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Professional Summary</label>
            <textarea
              value={profile?.summary || ""}
              onChange={(e) => updateField("summary", e.target.value)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Experience */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm text-zinc-400">Experience</label>
              <button
                onClick={() => addJSONItem("experience", { company: "", role: "", duration: "", description: "" })}
                className="text-sm bg-zinc-800 text-white px-3 py-1 rounded hover:bg-zinc-700 transition"
              >
                + Add Experience
              </button>
            </div>
            <div className="space-y-4">
              {experience.map((exp: any, i: number) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <input
                      placeholder="Company"
                      value={exp.company || ""}
                      onChange={(e) => updateJSONField("experience", i, "company", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                    />
                    <input
                      placeholder="Role"
                      value={exp.role || ""}
                      onChange={(e) => updateJSONField("experience", i, "role", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                    />
                    <input
                      placeholder="Duration (e.g., Jan 2020 - Dec 2022)"
                      value={exp.duration || ""}
                      onChange={(e) => updateJSONField("experience", i, "duration", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm md:col-span-2"
                    />
                  </div>
                  <textarea
                    placeholder="Description"
                    value={exp.description || ""}
                    onChange={(e) => updateJSONField("experience", i, "description", e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm mb-2"
                  />
                  <button
                    onClick={() => removeJSONItem("experience", i)}
                    className="text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm text-zinc-400">Education</label>
              <button
                onClick={() => addJSONItem("education", { school: "", degree: "", year: "" })}
                className="text-sm bg-zinc-800 text-white px-3 py-1 rounded hover:bg-zinc-700 transition"
              >
                + Add Education
              </button>
            </div>
            <div className="space-y-4">
              {education.map((edu: any, i: number) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      placeholder="School"
                      value={edu.school || ""}
                      onChange={(e) => updateJSONField("education", i, "school", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                    />
                    <input
                      placeholder="Degree"
                      value={edu.degree || ""}
                      onChange={(e) => updateJSONField("education", i, "degree", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                    />
                    <input
                      placeholder="Year"
                      value={edu.year || ""}
                      onChange={(e) => updateJSONField("education", i, "year", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm md:col-span-2"
                    />
                  </div>
                  <button
                    onClick={() => removeJSONItem("education", i)}
                    className="text-sm text-red-400 hover:text-red-300 transition mt-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium disabled:opacity-50 hover:bg-zinc-200 transition"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          
          <button
            onClick={() => router.push("/upload-cv")}
            className="bg-zinc-800 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition"
          >
            Re-upload CV
          </button>
          
          <button
            onClick={() => router.push("/resume")}
            className="bg-zinc-800 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition"
          >
            Build Resume →
          </button>
        </div>
      </div>
    </div>
  );
}