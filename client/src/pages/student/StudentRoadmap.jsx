import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import Header from "../../components/Header.jsx";
import {
  FiChevronDown,
  FiLock,
  FiTarget,
  FiUploadCloud,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiX,
} from "react-icons/fi";

const API_BASE = "http://localhost:3001";

function Badge({ kind, locked }) {
  // kind: "past" | "current" | "locked" | "year"
  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border";
  if (kind === "past") {
    return (
      <span className={`${base} bg-green-500/10 text-green-300 border-green-500/20`}>
        <FiCheckCircle size={14} />
        Completed / Past Year
      </span>
    );
  }
  if (kind === "current") {
    return (
      <span className={`${base} bg-cyan-500/10 text-cyan-300 border-cyan-500/20`}>
        <FiClock size={14} />
        Current Year
      </span>
    );
  }
  if (kind === "locked" || locked) {
    return (
      <span className={`${base} bg-gray-800 text-gray-400 border-gray-700`}>
        <FiLock size={14} />
        Locked
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-800 text-gray-300 border-gray-700`}>Year</span>
  );
}

export default function StudentRoadmap() {
  const [roles, setRoles] = useState([]);
  const [activeTarget, setActiveTarget] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roadmap, setRoadmap] = useState({ target: null, year: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // modal states
  const [open, setOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const [desc, setDesc] = useState("");

  // file upload states
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // accordion expanded years
  const [expandedYears, setExpandedYears] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const getUserId = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error("Not logged in");
    return user.id;
  };

  const uploadProofFile = async ({ file, studentId, jobRoleId, skillId }) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${studentId}/${jobRoleId}/${skillId}-${Date.now()}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from("skill-proofs")
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return data.path;
  };

  const loadAll = async () => {
    setLoading(true);
    setErr("");

    try {
      const token = await getToken();
      if (!token) throw new Error("No session. Please sign in.");

      const [roleRes, targetRes, roadmapRes] = await Promise.all([
        fetch(`${API_BASE}/job-roles`),
        fetch(`${API_BASE}/student/target`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/student/roadmap`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const roleData = await roleRes.json();
      const targetData = await targetRes.json();
      const roadmapData = await roadmapRes.json();

      if (!roleRes.ok) throw new Error(roleData.error || "Failed to load roles");
      if (!targetRes.ok) throw new Error(targetData.error || "Failed to load target");
      if (!roadmapRes.ok) throw new Error(roadmapData.error || "Failed to load roadmap");

      setRoles(Array.isArray(roleData) ? roleData : []);
      setActiveTarget(targetData);
      setRoadmap({
        target: roadmapData?.target ?? null,
        year: roadmapData?.year ?? null,
        items: Array.isArray(roadmapData?.items) ? roadmapData.items : [],
      });

      setSelectedRoleId(targetData?.job_role_id ? String(targetData.job_role_id) : "");

      // auto expand current year
      const currentYear = roadmapData?.year ? Number(roadmapData.year) : 1;
      setExpandedYears({ 1: false, 2: false, 3: false, 4: false, [currentYear]: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const setTargetAndGenerate = async () => {
    if (!selectedRoleId) return;

    setBusy(true);
    setErr("");

    try {
      const token = await getToken();
      if (!token) throw new Error("No session. Please sign in.");

      const tRes = await fetch(`${API_BASE}/student/target`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_role_id: Number(selectedRoleId) }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error || "Failed to set target");

      const gRes = await fetch(`${API_BASE}/student/roadmap/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_role_id: Number(selectedRoleId) }),
      });
      const gData = await gRes.json();
      if (!gRes.ok) throw new Error(gData.error || "Failed to generate roadmap");

      await loadAll();
      alert("Roadmap generated successfully");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const studentYear = roadmap?.year ? Number(roadmap.year) : null;

  const byYear = useMemo(() => {
    const obj = { 1: [], 2: [], 3: [], 4: [] };
    for (const item of roadmap.items || []) obj[item.planned_year]?.push(item);
    return obj;
  }, [roadmap.items]);

  const yearKind = (year) => {
    if (!studentYear) return "year";
    if (year < studentYear) return "past";
    if (year === studentYear) return "current";
    return "locked";
  };

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  // ===== Guards =====
  if (loading) {
    return (
      <main>
        <div className="min-h-screen bg-black text-white font-sans">
          <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
                Roadmap
              </h1>
              <p className="text-gray-400 text-lg mt-2">Map your skills to your career target</p>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 shadow-2xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-400">Loading roadmap...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <div className="min-h-screen bg-black text-white font-sans">
          <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
                Roadmap
              </h1>
              <p className="text-gray-400 text-lg mt-2">Map your skills to your career target</p>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-900/30 rounded-lg border border-red-700/50">
                  <FiAlertCircle size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white mb-1">Failed to load</p>
                  <p className="text-red-400">Error: {err}</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Try refreshing the page or signing in again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="min-h-screen bg-black text-white font-sans">
        {/* Header */}
        <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
              Roadmap
            </h1>
            <p className="text-gray-400 text-lg mt-2">
              Plan your milestones by year and submit proof for verification
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
            {/* Section Title */}
            <div className="mb-8">
              <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
                Career Roadmap
              </h2>
              <p className="text-gray-400">
                Choose a target role to generate yearly milestones, then upload proof to complete them.
              </p>
            </div>

            {/* Target Card */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-900/20 rounded-lg border border-teal-700/30">
                    <FiTarget size={22} className="text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Current Target
                    </p>
                    <p className="text-xl font-black text-white">
                      {activeTarget?.job_role?.job_role_name || "None"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full md:w-[360px] px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  >
                    <option value="">-- Select a job role --</option>
                    {roles.map((r) => (
                      <option key={r.job_role_id} value={r.job_role_id}>
                        {r.job_role_name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={setTargetAndGenerate}
                    disabled={!selectedRoleId || busy}
                    className={`px-5 py-3 rounded-xl font-semibold transition-all border inline-flex items-center justify-center gap-2 ${
                      !selectedRoleId || busy
                        ? "bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-cyan-400/20 shadow-lg hover:shadow-cyan-500/20"
                    }`}
                  >
                    {busy ? "Working..." : "Generate"}
                  </button>
                </div>
              </div>
            </div>

            {/* Roadmap */}
            {!roadmap.target ? (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-300">
                Set a target to unlock your roadmap.
              </div>
            ) : (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((year) => {
                  const locked = studentYear && year > studentYear;
                  const expanded = !!expandedYears[year];

                  return (
                    <div
                      key={year}
                      className={`rounded-2xl border overflow-hidden transition-all ${
                        expanded
                          ? "bg-gray-800 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                          : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleYear(year)}
                        className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <p className="text-xl font-black text-white">Year {year}</p>
                          <Badge kind={yearKind(year)} locked={locked} />
                        </div>

                        <FiChevronDown
                          className={`text-gray-400 transition-transform ${
                            expanded ? "rotate-180 text-cyan-300" : ""
                          }`}
                          size={20}
                        />
                      </button>

                      {/* Accordion Content */}
                      {expanded && (
                        <div className="px-6 pb-6">
                          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6" />

                          {locked ? (
                            <div className="flex items-center gap-2 text-gray-400 italic bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                              <FiLock />
                              Not applicable for your year yet.
                            </div>
                          ) : byYear[year].length === 0 ? (
                            <p className="text-gray-400">No skills assigned.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {byYear[year].map((s) => {
                                const ps = s.proof_status; // null | pending | approved | rejected
                                const canSubmit = ps === null || ps === "rejected";

                                let buttonText = "Upload Proof";
                                let buttonClass =
                                  "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-cyan-400/20";

                                if (ps === "approved") {
                                  buttonText = "Approved";
                                  buttonClass =
                                    "bg-green-700 text-white border-green-500/20 cursor-not-allowed";
                                } else if (ps === "pending") {
                                  buttonText = "Pending";
                                  buttonClass =
                                    "bg-yellow-700 text-white border-yellow-500/20 cursor-not-allowed";
                                } else if (ps === "rejected") {
                                  buttonText = "Resubmit";
                                  buttonClass =
                                    "bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white border-red-400/20";
                                }

                                return (
                                  <div
                                    key={s.progress_id}
                                    className="bg-gray-900/40 border border-gray-700 rounded-2xl p-5 shadow-lg"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="font-black text-white text-lg leading-tight">
                                          {s.skill_name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          Status:{" "}
                                          <span className="text-gray-200 font-medium">
                                            {s.progress_status}
                                          </span>
                                          {ps ? ` | Proof: ${ps}` : ""}
                                        </p>
                                      </div>

                                      {ps === "approved" ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-300 bg-green-900/20 border border-green-700/30 px-2 py-1 rounded-full">
                                          <FiCheckCircle size={14} /> Approved
                                        </span>
                                      ) : ps === "pending" ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-300 bg-yellow-900/20 border border-yellow-700/30 px-2 py-1 rounded-full">
                                          <FiClock size={14} /> Pending
                                        </span>
                                      ) : ps === "rejected" ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-300 bg-red-900/20 border border-red-700/30 px-2 py-1 rounded-full">
                                          <FiXCircle size={14} /> Rejected
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-300 bg-gray-800 border border-gray-700 px-2 py-1 rounded-full">
                                          Not submitted
                                        </span>
                                      )}
                                    </div>

                                    {ps === "rejected" && s.review_note ? (
                                      <div className="mt-4 bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
                                          Advisor Note
                                        </p>
                                        <p className="text-red-100 text-sm">{s.review_note}</p>
                                      </div>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!canSubmit) return;
                                        setActiveSkill(s);
                                        setDesc("");
                                        setFile(null);
                                        setOpen(true);
                                      }}
                                      disabled={!canSubmit}
                                      className={`mt-4 w-full py-3 px-4 rounded-xl font-semibold transition-all border inline-flex items-center justify-center gap-2 ${
                                        canSubmit
                                          ? `${buttonClass} shadow-lg hover:shadow-cyan-500/20`
                                          : "bg-gray-800 text-gray-400 border-gray-700 cursor-not-allowed"
                                      }`}
                                      title={
                                        canSubmit
                                          ? "Submit/Resubmit proof"
                                          : `Proof is ${ps}`
                                      }
                                    >
                                      <FiUploadCloud size={18} />
                                      {buttonText}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-8 text-sm text-gray-500 italic">
              Tip: Complete missing skills in each year and upload proofs for verification.
            </p>
          </div>
        </div>

        {/* ===================== MODAL ===================== */}
        {open && activeSkill && roadmap?.target && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-800 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {activeSkill.proof_status === "rejected" ? "Resubmit Proof" : "Submit Proof"}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Skill:{" "}
                    <span className="text-cyan-300 font-semibold">
                      {activeSkill.skill_name}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setOpen(false);
                    setActiveSkill(null);
                    setFile(null);
                    setDesc("");
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <FiX size={24} className="text-gray-400 hover:text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {activeSkill.proof_status === "rejected" && activeSkill.review_note ? (
                  <div className="mb-5 p-4 bg-red-900/20 border border-red-700/30 rounded-xl">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
                      Advisor Note
                    </p>
                    <p className="text-red-100">{activeSkill.review_note}</p>
                  </div>
                ) : null}

                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Upload file (PDF / Image)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                {file && (
                  <p className="text-xs text-cyan-300 font-semibold mt-2">
                    Selected: {file.name}
                  </p>
                )}

                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mt-5 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="What is this proof showing?"
                />

                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setActiveSkill(null);
                      setFile(null);
                      setDesc("");
                    }}
                    className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition-all border border-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={uploading}
                    onClick={async () => {
                      if (!file) return alert("Please select a PDF/image file.");

                      setUploading(true);
                      try {
                        const token = await getToken();
                        if (!token) throw new Error("No session. Please sign in.");

                        const studentId = await getUserId();

                        const storagePath = await uploadProofFile({
                          file,
                          studentId,
                          jobRoleId: roadmap.target.job_role_id,
                          skillId: activeSkill.skill_id,
                        });

                        const res = await fetch(`${API_BASE}/student/proofs`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            job_role_id: roadmap.target.job_role_id,
                            skill_id: activeSkill.skill_id,
                            file_url: storagePath,
                            description: desc?.trim() || null,
                          }),
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Submit failed");

                        alert("Submitted. Pending approval.");
                        setOpen(false);
                        setActiveSkill(null);
                        setFile(null);
                        setDesc("");
                        await loadAll();
                      } catch (e) {
                        alert(`${e.message}`);
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className={`px-5 py-3 rounded-xl font-semibold transition-all border inline-flex items-center justify-center gap-2 ${
                      uploading
                        ? "bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-cyan-400/20 shadow-lg hover:shadow-cyan-500/20"
                    }`}
                  >
                    <FiUploadCloud size={18} />
                    {uploading ? "Uploading..." : "Submit"}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Tip: Upload clear evidence (PDF/image) so your advisor can review faster.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
