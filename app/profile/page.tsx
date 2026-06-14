"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COMMON_ROLES = [
  "Compliance Officer", "AML Analyst", "KYC Specialist", "Risk Manager",
  "Fraud Analyst", "Customer Support", "Operations Manager", "Team Lead",
  "Trust & Safety", "Regulatory Affairs", "Data Analyst", "Project Manager",
  "Software Engineer", "Product Manager", "Sales", "Marketing"
];

const COMMON_INDUSTRIES = [
  "Finance", "Banking", "Fintech", "Technology", "Healthcare",
  "E-commerce", "Consulting", "Legal", "Insurance", "Real Estate",
  "Energy", "Telecommunications", "Gaming", "Crypto", "Government"
];

// Auto-formats text into paragraphs if no newlines exist
function FormattedText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return <p className="text-zinc-500 text-sm">—</p>;
  
  // If text already has newlines, respect them
  if (text.includes('\n')) {
    return <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>{text}</div>;
  }
  
  // Split into sentences and group into paragraphs (3-4 sentences each)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (sentences.length <= 1) {
    return <p className={className}>{text}</p>;
  }
  
  const paragraphs: string[] = [];
  let current: string[] = [];
  
  for (const sentence of sentences) {
    current.push(sentence);
    if (current.length >= 3) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  
  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i} className="mb-3 last:mb-0 leading-relaxed">{para}</p>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setError(null);
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load profile");
        setProfile({});
      } else if (data && !data.error) {
        setProfile(data);
      } else {
        setProfile(data || {});
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Network error loading profile");
      setProfile({});
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        alert("Failed to save profile: " + (data.error || "Unknown error"));
      } else {
        setProfile(data);
        setIsEditing(false);
        alert("Profile saved!");
      }
    } catch (err) {
      setError("Network error saving profile");
      alert("Failed to save profile");
    }
    setSaving(false);
  }

  function updateField(field: string, value: string | number) {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  }

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

  function getMultiSelect(field: string): string[] {
    const val = profile?.[field];
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return val.split(/[,;]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }

  function addMultiSelect(field: string, value: string) {
    const current = getMultiSelect(field);
    if (!current.includes(value)) {
      updateField(field, [...current, value].join("; "));
    }
  }

  function removeMultiSelect(field: string, value: string) {
    const current = getMultiSelect(field).filter((v: string) => v !== value);
    updateField(field, current.join("; "));
  }

  const currency = profile?.currency || "$";
  const currencySymbol = currency === "€" ? "€" : currency === "£" ? "£" : "$";
  const desiredRoles = getMultiSelect("desired_role");
  const industries = getMultiSelect("industries");

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white p-10 pt-24">Loading...</div>;

  const experience = parseJSON("experience");
  const education = parseJSON("education");

  const renderField = (label: string, value: string | number, multiline?: boolean) => {
    if (isEditing) return null;
    return (
      <div className="mb-4">
        <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
        {multiline ? (
          <FormattedText text={String(value || "")} className="text-zinc-200 text-sm" />
        ) : (
          <p className="text-zinc-200 text-sm">{value || "—"}</p>
        )}
      </div>
    );
  };

  const renderEditInput = (label: string, field: string, type: string = "text", placeholder?: string, props?: any) => (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={profile?.[field] || ""}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
          {...props}
        />
      ) : (
        <input
          type={type}
          value={profile?.[field] || ""}
          onChange={(e) => updateField(field, type === "number" ? (e.target.value ? parseInt(e.target.value) : "") : e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
          {...props}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10 pt-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <button
            onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
            disabled={saving}
            className="bg-white text-zinc-900 px-5 py-2 rounded-full font-medium text-sm disabled:opacity-50 hover:bg-zinc-200 transition"
          >
            {saving ? "Saving..." : isEditing ? "Save Profile" : "Edit Profile"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Basic Information</h2>
          {isEditing ? (
            <div className="grid md:grid-cols-2 gap-4">
              {renderEditInput("Full Name", "full_name")}
              {renderEditInput("Email", "email", "email")}
              {renderEditInput("Phone", "phone")}
              {renderEditInput("Location", "location")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Full Name", profile?.full_name)}
              {renderField("Email", profile?.email)}
              {renderField("Phone", profile?.phone)}
              {renderField("Location", profile?.location)}
            </div>
          )}
          <div className="mt-4">
            {isEditing ? renderEditInput("LinkedIn", "linkedin") : renderField("LinkedIn", profile?.linkedin)}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-white">About</h2>
          {isEditing ? (
            <>
              <div className="mb-4">
                {renderEditInput("Skills (comma-separated)", "skills", "textarea", undefined, { rows: 3 })}
              </div>
              <div>
                {renderEditInput("Professional Summary", "summary", "textarea", undefined, { rows: 4 })}
              </div>
            </>
          ) : (
            <>
              {renderField("Skills", profile?.skills)}
              {renderField("Professional Summary", profile?.summary, true)}
            </>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Job Preferences</h2>
          <p className="text-zinc-400 text-sm mb-4">These help us find the best matching jobs for you.</p>
          
          {isEditing ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Desired Roles</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {desiredRoles.map((role: string) => (
                    <span key={role} className="bg-zinc-800 text-zinc-200 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                      {role}
                      <button onClick={() => removeMultiSelect("desired_role", role)} className="text-zinc-500 hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={roleInput}
                    onChange={(e) => {
                      if (e.target.value) {
                        addMultiSelect("desired_role", e.target.value);
                        setRoleInput("");
                      }
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">Select a role...</option>
                    {COMMON_ROLES.filter(r => !desiredRoles.includes(r)).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && roleInput.trim()) {
                        e.preventDefault();
                        addMultiSelect("desired_role", roleInput.trim());
                        setRoleInput("");
                      }
                    }}
                    placeholder="Or type & hit Enter"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Experience Level</label>
                <select
                  value={profile?.experience_level || ""}
                  onChange={(e) => updateField("experience_level", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Select level</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Min Salary ({currencySymbol})</label>
                <input
                  type="number"
                  value={profile?.desired_salary_min || ""}
                  onChange={(e) => updateField("desired_salary_min", e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="50000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Max Salary ({currencySymbol})</label>
                <input
                  type="number"
                  value={profile?.desired_salary_max || ""}
                  onChange={(e) => updateField("desired_salary_max", e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="120000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Desired Location</label>
                <input
                  type="text"
                  value={profile?.desired_location || ""}
                  onChange={(e) => updateField("desired_location", e.target.value)}
                  placeholder="e.g. New York, Remote, London"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Work Type</label>
                <select
                  value={profile?.work_type || ""}
                  onChange={(e) => updateField("work_type", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Job Type</label>
                <select
                  value={profile?.job_type || ""}
                  onChange={(e) => updateField("job_type", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Any</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Industries</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {industries.map((ind: string) => (
                    <span key={ind} className="bg-zinc-800 text-zinc-200 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                      {ind}
                      <button onClick={() => removeMultiSelect("industries", ind)} className="text-zinc-500 hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={industryInput}
                    onChange={(e) => {
                      if (e.target.value) {
                        addMultiSelect("industries", e.target.value);
                        setIndustryInput("");
                      }
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">Select an industry...</option>
                    {COMMON_INDUSTRIES.filter(i => !industries.includes(i)).map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={industryInput}
                    onChange={(e) => setIndustryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && industryInput.trim()) {
                        e.preventDefault();
                        addMultiSelect("industries", industryInput.trim());
                        setIndustryInput("");
                      }
                    }}
                    placeholder="Or type & hit Enter"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Desired Roles", desiredRoles.join(", "))}
              {renderField("Experience Level", profile?.experience_level)}
              {renderField("Currency", currency)}
              {renderField("Salary Range", profile?.desired_salary_min && profile?.desired_salary_max 
                ? `${currencySymbol}${profile.desired_salary_min.toLocaleString()} - ${currencySymbol}${profile.desired_salary_max.toLocaleString()}`
                : profile?.desired_salary_min ? `${currencySymbol}${profile.desired_salary_min.toLocaleString()}+` : "—"
              )}
              {renderField("Desired Location", profile?.desired_location)}
              {renderField("Work Type", profile?.work_type)}
              {renderField("Job Type", profile?.job_type)}
              {renderField("Industries", industries.join(", "))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Experience</h2>
            {isEditing && (
              <button
                onClick={() => addJSONItem("experience", { company: "", role: "", duration: "", description: "" })}
                className="text-sm bg-zinc-800 text-white px-3 py-1 rounded hover:bg-zinc-700 transition"
              >
                + Add Experience
              </button>
            )}
          </div>
          <div className="space-y-4">
            {experience.map((exp: any, i: number) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                {isEditing ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-white">{exp.role || "Untitled Role"}</h3>
                      <span className="text-zinc-500 text-sm">{exp.duration}</span>
                    </div>
                    <p className="text-zinc-400 text-sm mb-2">{exp.company}</p>
                    <FormattedText text={exp.description || ""} className="text-zinc-300 text-sm" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Education</h2>
            {isEditing && (
              <button
                onClick={() => addJSONItem("education", { school: "", degree: "", year: "" })}
                className="text-sm bg-zinc-800 text-white px-3 py-1 rounded hover:bg-zinc-700 transition"
              >
                + Add Education
              </button>
            )}
          </div>
          <div className="space-y-4">
            {education.map((edu: any, i: number) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                {isEditing ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-white">{edu.degree || "Untitled Degree"}</h3>
                      <span className="text-zinc-500 text-sm">{edu.year}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">{edu.school}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {isEditing ? (
            <>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium disabled:opacity-50 hover:bg-zinc-200 transition"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-zinc-800 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition"
              >
                Edit Profile
              </button>
              <button
                onClick={() => router.push("/upload-cv")}
                className="bg-zinc-800 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition"
              >
                Re-upload CV
              </button>
              <button
                onClick={() => router.push("/discover")}
                className="bg-zinc-800 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition"
              >
                Discover Jobs →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}