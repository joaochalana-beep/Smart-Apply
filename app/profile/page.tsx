"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COMMON_ROLES = [
  "Trust & Safety", "Customer Support", "Risk Manager", "Marketing", "KYC Specialist",
  "AML Analyst", "Compliance Officer", "Customer Success Manager", "Technical Support",
  "Account Manager", "Sales Representative", "Business Development", "Product Manager",
  "Project Manager", "Operations Manager", "Data Analyst", "Data Scientist",
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "DevOps Engineer", "QA Engineer", "UX Designer", "UI Designer", "Product Designer",
  "Content Moderator", "Fraud Analyst", "Payment Operations", "Banking Operations",
  "Financial Analyst", "Credit Analyst", "Underwriter", "Claims Handler", "Insurance Agent",
  "Mortgage Advisor", "Investment Analyst", "Wealth Manager", "Treasury Analyst",
  "Accountant", "Bookkeeper", "Payroll Specialist", "Tax Advisor", "Auditor",
  "Financial Controller", "Procurement Specialist", "Supply Chain Manager",
  "Logistics Coordinator", "Warehouse Manager", "Import/Export Specialist",
  "Inventory Manager", "Demand Planner", "HR Generalist", "HR Business Partner",
  "Talent Acquisition", "Recruiter", "Learning & Development", "Compensation & Benefits",
  "HR Operations", "Office Manager", "Executive Assistant", "Administrative Assistant",
  "Receptionist", "Facilities Manager", "Legal Counsel", "Paralegal", "Contract Manager",
  "Regulatory Affairs", "Quality Assurance", "Quality Control", "Health & Safety Officer",
  "Environmental Manager", "Sustainability Manager", "Corporate Social Responsibility",
  "Public Relations", "Communications Manager", "Social Media Manager", "Content Writer",
  "Copywriter", "SEO Specialist", "SEM Specialist", "Digital Marketing", "Growth Hacker",
  "Email Marketing", "Affiliate Marketing", "Brand Manager", "Market Research Analyst",
  "CRM Manager", "IT Support", "System Administrator", "Network Engineer", "Security Engineer",
  "Cloud Architect", "Database Administrator", "Business Intelligence", "Machine Learning Engineer",
  "AI Engineer", "Robotics Engineer", "Cybersecurity Analyst", "Penetration Tester",
  "Incident Response", "Blockchain Developer", "Smart Contract Developer", "Web3 Developer",
  "Mobile Developer", "iOS Developer", "Android Developer", "Game Developer",
  "Embedded Systems Engineer", "Hardware Engineer", "IoT Developer", "Technical Writer",
  "Documentation Specialist", "Knowledge Manager", "Scrum Master", "Agile Coach",
  "Delivery Manager", "Program Manager", "Change Manager", "Strategy Consultant",
  "Management Consultant", "Business Analyst", "Process Improvement", "Six Sigma Specialist",
  "Customer Experience", "User Researcher", "Information Architect", "Interaction Designer",
  "Motion Designer", "Graphic Designer", "Video Editor", "Photographer", "Videographer",
  "Podcast Producer", "Event Coordinator", "Event Manager", "Conference Producer",
  "Travel Coordinator", "Translator", "Interpreter", "Localization Specialist", "Linguist",
  "Language Teacher", "Trainer", "Instructional Designer", "E-learning Developer",
  "Curriculum Developer", "Academic Advisor", "Research Analyst", "Policy Analyst",
  "Economist", "Statistician", "Surveyor", "Cartographer", "Urban Planner", "Architect",
  "Interior Designer", "Landscape Architect", "Civil Engineer", "Structural Engineer",
  "Mechanical Engineer", "Electrical Engineer", "Chemical Engineer", "Petroleum Engineer",
  "Mining Engineer", "Aerospace Engineer", "Marine Engineer", "Nuclear Engineer",
  "Biomedical Engineer", "Environmental Engineer", "Renewable Energy Engineer", "Pharmacist",
  "Lab Technician", "Research Scientist", "Clinical Research", "Medical Writer",
  "Healthcare Administrator", "Patient Care Coordinator", "Nurse", "Caregiver",
  "Physiotherapist", "Occupational Therapist", "Psychologist", "Counselor", "Social Worker",
  "Youth Worker", "Community Outreach", "Fundraising Manager", "Grant Writer",
  "Nonprofit Manager", "NGO Coordinator", "Volunteer Coordinator", "Real Estate Agent",
  "Property Manager", "Leasing Consultant", "Construction Manager", "Site Supervisor",
  "Quantity Surveyor", "Building Inspector", "HVAC Technician", "Electrician", "Plumber",
  "Carpenter", "Painter", "Landscaper", "Cleaning Supervisor", "Security Guard",
  "CCTV Operator", "Loss Prevention", "Chef", "Sous Chef", "Line Cook", "Baker",
  "Pastry Chef", "Restaurant Manager", "Bar Manager", "Barista", "Bartender", "Waiter",
  "Host", "Food Safety Inspector", "Nutritionist", "Dietitian", "Personal Trainer",
  "Fitness Instructor", "Yoga Instructor", "Sports Coach", "Athletic Director",
  "Sports Manager", "Recreation Coordinator", "Tour Guide", "Travel Agent", "Hotel Manager",
  "Front Desk Agent", "Concierge", "Housekeeping Manager", "Spa Manager", "Cruise Director",
  "Flight Attendant", "Pilot", "Air Traffic Controller", "Customs Officer", "Border Agent",
  "Immigration Officer", "Diplomat", "Consular Officer", "Chauffeur", "Delivery Driver",
  "Truck Driver", "Fleet Manager", "Dispatcher"
];

const COMMON_INDUSTRIES = [
  "Finance", "Banking", "Fintech", "Technology", "Healthcare",
  "E-commerce", "Consulting", "Legal", "Insurance", "Real Estate",
  "Energy", "Telecommunications", "Gaming", "Crypto", "Government"
];

const COMMON_LANGUAGES = [
  "English", "Portuguese", "Spanish", "French", "German", "Italian",
  "Dutch", "Russian", "Chinese", "Japanese", "Arabic", "Hindi", "Polish",
  "Turkish", "Swedish", "Danish", "Norwegian", "Finnish", "Greek", "Czech"
];

// Auto-formats text into paragraphs if no newlines exist
function FormattedText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return <p className="text-zinc-500 text-sm">—</p>;
  
  if (text.includes('\n')) {
    return <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>{text}</div>;
  }
  
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
  const [langInput, setLangInput] = useState("");
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

  function updateField(field: string, value: string | number | string[]) {
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

  // Languages are stored as array, not semicolon-separated string
  function getLanguages(): string[] {
    const val = profile?.languages;
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }

  function addLanguage(value: string) {
    const current = getLanguages();
    const trimmed = value.trim();
    if (trimmed && !current.includes(trimmed)) {
      updateField("languages", [...current, trimmed]);
    }
  }

  function removeLanguage(value: string) {
    const current = getLanguages().filter((v: string) => v !== value);
    updateField("languages", current);
  }

  const currency = profile?.currency || "$";
  const currencySymbol = currency === "€" ? "€" : currency === "£" ? "£" : "$";
  const desiredRoles = getMultiSelect("desired_role");
  const industries = getMultiSelect("industries");
  const languages = getLanguages();

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
            ⚠ {error}
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Basic Information</h2>
          {isEditing ? (
            <div className="grid md:grid-cols-2 gap-4">
              {renderEditInput("Full Name", "full_name")}
              {renderEditInput("Personal Email (backup)", "personal_email", "email")}
              {renderEditInput("Phone", "phone")}
              {renderEditInput("Location", "location")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Full Name", profile?.full_name)}
              {renderField("Personal Email (backup)", profile?.personal_email)}
              {renderField("Phone", profile?.phone)}
              {renderField("Location", profile?.location)}
            </div>
          )}

          <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
            <label className="block text-xs text-indigo-300 uppercase tracking-wider mb-1">Your ApplyWise Email</label>
            <p className="text-white font-medium">{profile?.applywise_email || "—"}</p>
            <p className="text-indigo-300/70 text-xs mt-1">
              All application emails are sent from this address. Company replies arrive in your inbox.
            </p>
          </div>

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

              {/* NEW: Languages Section */}
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Languages You Speak</label>
                <p className="text-xs text-zinc-500 mb-2">We'll filter out jobs that require languages you don't speak</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {languages.map((lang: string) => (
                    <span key={lang} className="bg-blue-900/50 text-blue-200 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                      {lang}
                      <button onClick={() => removeLanguage(lang)} className="text-blue-400 hover:text-blue-200">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={langInput}
                    onChange={(e) => {
                      if (e.target.value) {
                        addLanguage(e.target.value);
                        setLangInput("");
                      }
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">Select a language...</option>
                    {COMMON_LANGUAGES.filter(l => !languages.includes(l)).map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && langInput.trim()) {
                        e.preventDefault();
                        addLanguage(langInput.trim());
                        setLangInput("");
                      }
                    }}
                    placeholder="Or type & hit Enter"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
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
              {renderField("Languages", languages.join(", ") || "—")}
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