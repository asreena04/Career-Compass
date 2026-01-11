import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const OTHER_OPTION_VALUE = "OTHER_CUSTOM_SKILL";
const today = new Date().toISOString().split("T")[0];

// Must match your DB normalize_skill logic (client-side only for duplicate prevention in UI)
const normalizeLocal = (input) => {
  if (!input) return "";
  let x = input.toLowerCase().trim();
  x = x.replace(/c\+\+/g, "cplusplus");
  x = x.replace(/c#/g, "csharp");
  x = x.replace(/\.net/g, "dotnet");
  x = x.replace(/[^a-z0-9]/g, "");
  return x;
};

// Build lookup: normalized -> canonical skill_name (from dropdown)
const buildSkillLookup = (skillOptions) => {
  const map = new Map();
  for (const s of skillOptions) {
    map.set(normalizeLocal(s.skill_name), s.skill_name);
  }
  return map;
};

const JobPostForm = ({ onPostSuccess, initialData = null, isEditing = false }) => {

  // Dropdown options
  const [jobRoles, setJobRoles] = useState([]);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState(initialData?.job_role_id || "");

  const [skillOptions, setSkillOptions] = useState([]); // [{skill_id, skill_name}]
  const [currentSkillInput, setCurrentSkillInput] = useState("");

  // UI states
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [jobData, setJobData] = useState({
    jobTitle: initialData?.job_title || "",
    description: initialData?.description || "",
    selectedSkills: initialData?.skills || [], // Expected: [{name, is_other}]
    applicationDeadline: initialData?.application_deadline || "",
    location: initialData?.location || "",
    salaryRange: initialData?.salary_range || "",
    applicationLink: initialData?.application_link || ""
  });

  // Load job roles and skills (USM-seeded) from server
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        // load job roles
        const roleRes = await fetch(`${API_BASE}/job-roles`);
        const roleData = await roleRes.json();
        if (!roleRes.ok) throw new Error(roleData.error || "Failed to load job roles");
        setJobRoles(roleData);
        if (roleData.length > 0) setSelectedJobRoleId(String(roleData[0].job_role_id));

        // load skills (USM only for dropdown)
        const skillRes = await fetch(`${API_BASE}/skills/usm`);
        const skillData = await skillRes.json();
        if (!skillRes.ok) throw new Error(skillData.error || "Failed to load skills");
        setSkillOptions(skillData);
        if (skillData.length > 0) setCurrentSkillInput(skillData[0].skill_name);
      } catch (e) {
        console.error(e);
        alert("❌ Cannot load dropdown data. Check if server is running and endpoints exist.");
      }
    };

    loadDropdowns();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (e) => {
    const value = e.target.value;

    if (value === OTHER_OPTION_VALUE) {
      setShowCustomInput(true);
      setCurrentSkillInput(""); // start empty
    } else {
      setShowCustomInput(false);
      setCurrentSkillInput(value); // skill_name
    }
  };

  const handleAddSkill = () => {
    const raw = currentSkillInput.trim();
    if (!raw) return;

    const norm = normalizeLocal(raw);

    // If typed skill exists in dropdown, treat it as USM skill (is_other=false)
    const lookup = buildSkillLookup(skillOptions);
    const canonical = lookup.get(norm); // e.g. "Python"
    const finalName = canonical || raw;
    const finalIsOther = canonical ? false : showCustomInput;

    // Duplicate prevention by normalized value
    const exists = jobData.selectedSkills.some((s) => normalizeLocal(s.name) === norm);
    if (exists) return;

    setJobData((prev) => ({
      ...prev,
      selectedSkills: [...prev.selectedSkills, { name: finalName, is_other: finalIsOther }],
    }));

    // reset dropdown selection back to first skill
    setShowCustomInput(false);
    if (skillOptions.length > 0) setCurrentSkillInput(skillOptions[0].skill_name);
    else setCurrentSkillInput("");
  };

  const handleRemoveSkill = (skillName) => {
    setJobData((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.filter((s) => s.name !== skillName),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // get JWT token from Supabase auth session
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(sessErr.message);
      const token = session?.access_token;
      if (!token) throw new Error("No session token. Please sign in first.");

      if (!selectedJobRoleId) throw new Error("Please select a job role.");
      if (!jobData.jobTitle.trim()) throw new Error("Job Title is required.");
      if (!jobData.description.trim()) throw new Error("Job Description is required.");
      if (!jobData.location.trim()) throw new Error("Location is required.");
      if (!jobData.applicationDeadline) throw new Error("Application Deadline is required.");
      if (jobData.selectedSkills.length === 0) throw new Error("Please add at least 1 skill.");

      // 1. Determine dynamic URL and Method
      const url = isEditing
        ? `${API_BASE}/job-postings/${initialData.job_posting_id}`
        : `${API_BASE}/job-postings`;

      const method = isEditing ? "PUT" : "POST";

      const payload = {
        job_role_id: Number(selectedJobRoleId),
        job_title: jobData.jobTitle,
        description: jobData.description,
        location: jobData.location,
        application_link: jobData.applicationLink,
        salary_range: jobData.salaryRange || null,
        application_deadline: jobData.applicationDeadline,
        skills: jobData.selectedSkills, // [{name,is_other}]
      };

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post job");

      alert(isEditing ? "Job updated successfully!" : "Job posted successfully!");

      // reset form
      setJobData({
        jobTitle: "",
        description: "",
        selectedSkills: [],
        applicationDeadline: "",
        location: "",
        salaryRange: "",
        educationRequirements: "",
        applicationLink: "",
      });

      setShowCustomInput(false);
      if (skillOptions.length > 0) setCurrentSkillInput(skillOptions[0].skill_name);
      else setCurrentSkillInput("");

      if (onPostSuccess) onPostSuccess();
    } catch (err) {
      console.error(err);
      alert(`${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-8 sm:p-10 bg-black text-white flex justify-center items-center">
      <div className="max-w-4xl w-full p-8 bg-gray-900 rounded-xl shadow-2xl shadow-gray-950 border border-gray-700">
        <h2 className="text-4xl font-extrabold text-teal-400 text-center mb-10 border-b border-gray-700 pb-4">
          {isEditing ? "Edit Job Posting" : "Create New Job Post"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Job Role */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Job Role<span className="text-red-400">*</span>
            </label>
            <select
              value={selectedJobRoleId}
              onChange={(e) => setSelectedJobRoleId(e.target.value)}
              className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500"
              required
            >
              {jobRoles.map((r) => (
                <option key={r.job_role_id} value={r.job_role_id}>
                  {r.job_role_name}
                </option>
              ))}
            </select>
          </div>

          {/* Title + Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="jobTitle" className="block text-sm font-semibold text-gray-300">
                Job Title<span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="jobTitle"
                name="jobTitle"
                value={jobData.jobTitle}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150 placeholder-gray-400"
                placeholder="e.g., Junior Software Engineer"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="applicationDeadline" className="block text-sm font-semibold text-gray-300">
                Application Deadline<span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                id="applicationDeadline"
                name="applicationDeadline"
                value={jobData.applicationDeadline}
                onChange={handleChange}
                min={today}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-semibold text-gray-300">
              Job Description<span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={jobData.description}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150 placeholder-gray-400"
              placeholder="Provide a detailed description of the role and responsibilities."
              rows="5"
            />
          </div>

          {/* Required Skills */}
          <div className="space-y-4 border border-teal-700/50 p-6 rounded-xl bg-gray-800 shadow-inner shadow-gray-900">
            <label className="block text-lg font-extrabold text-teal-400">
              🛠️ Required Skills<span className="text-red-400">*</span>
            </label>

            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 items-stretch">
              <select
                id="skillSelect"
                value={showCustomInput ? OTHER_OPTION_VALUE : currentSkillInput}
                onChange={handleDropdownChange}
                className={`flex-grow p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150 ${
                  showCustomInput ? "sm:w-1/3" : "sm:w-2/3"
                }`}
                disabled={skillOptions.length === 0 && !showCustomInput}
              >
                {skillOptions.map((s) => (
                  <option key={s.skill_id} value={s.skill_name}>
                    {s.skill_name}
                  </option>
                ))}
                <option value={OTHER_OPTION_VALUE} className="font-bold text-teal-300">
                  --- Other / Custom Skill ---
                </option>
              </select>

              {showCustomInput && (
                <input
                  type="text"
                  value={currentSkillInput}
                  onChange={(e) => setCurrentSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-grow p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150 placeholder-gray-400 sm:w-1/3"
                  placeholder="Type custom skill name..."
                />
              )}

              <button
                type="button"
                onClick={handleAddSkill}
                disabled={!currentSkillInput || (showCustomInput && currentSkillInput.trim() === "")}
                className={`py-3 px-6 font-bold rounded-lg shadow-md transition duration-300 sm:w-auto ${
                  currentSkillInput && (!showCustomInput || currentSkillInput.trim() !== "")
                    ? "bg-teal-600 text-gray-900 hover:bg-teal-700"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                + Add Skill
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 min-h-[40px] border-t border-gray-700 pt-4">
              {jobData.selectedSkills.length === 0 ? (
                <p className="text-gray-500 italic text-sm">
                  Select skills from dropdown & click 'Add Skill'.
                </p>
              ) : (
                jobData.selectedSkills.map((s) => (
                  <span
                    key={`${normalizeLocal(s.name)}`} // normalized key avoids duplicates with different casing
                    className="flex items-center bg-gray-700 text-teal-300 text-sm font-medium pr-1 pl-3 py-1 rounded-full border border-teal-500/30 shadow-md"
                  >
                    {s.name}
                    {s.is_other && <span className="ml-2 text-xs text-yellow-300">(Other)</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s.name)}
                      className="ml-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Location + Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="location" className="block text-sm font-semibold text-gray-300">
                Location<span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={jobData.location}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150 placeholder-gray-400"
                placeholder="e.g., Remote, Penang, Kedah"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="salaryRange" className="block text-sm font-semibold text-gray-300">
                Salary Range
              </label>
              <input
                type="text"
                id="salaryRange"
                name="salaryRange"
                value={jobData.salaryRange}
                onChange={handleChange}
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150 placeholder-gray-400"
                placeholder="e.g., RM 4,000 - RM 6,000 / month"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="applicationLink" className="block text-sm font-semibold text-gray-300">
              Application Link / URL<span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              id="applicationLink"
              name="applicationLink"
              value={jobData.applicationLink}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-teal-500 focus:border-teal-500"
              placeholder="https://company.com/careers/apply"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-teal-600 text-gray-900 font-extrabold text-lg rounded-xl shadow-lg shadow-teal-900/50 focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-opacity-50 transition duration-300 transform hover:scale-[1.01] disabled:bg-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (isEditing ? "Saving..." : "Posting Job...")
              : (isEditing ? "Save Changes" : "Post Job")
            }
          </button>
        </form>
      </div>
    </div>
  );
};

export default JobPostForm;