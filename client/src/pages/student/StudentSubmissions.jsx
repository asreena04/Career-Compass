import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { FiFileText, FiUploadCloud,FiX,FiAlertCircle,FiCheckCircle,FiClock,FiXCircle,FiExternalLink } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const BUCKET = "skill-proofs";

async function openProofFile(pathOrUrl) {
  if (!pathOrUrl) return;

  // If already a full URL, just open it
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    window.open(pathOrUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // Otherwise assume it's a storage path and create a signed URL
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(
    pathOrUrl,
    60 * 10 // 10 minutes
  );

  if (error) {
    alert("Cannot open file: " + error.message);
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border";

  if (status === "approved") {
    return (
      <span className={`${base} bg-green-500/10 text-green-300 border-green-500/20`}>
        <FiCheckCircle size={14} />
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className={`${base} bg-red-500/10 text-red-300 border-red-500/20`}>
        <FiXCircle size={14} />
        Rejected
      </span>
    );
  }

  return (
    <span className={`${base} bg-yellow-500/10 text-yellow-300 border-yellow-500/20`}>
      <FiClock size={14} />
      Pending
    </span>
  );
}

export default function StudentSubmissions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [fileObject, setFileObject] = useState(null);

  // resubmit modal state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const token = await getToken();
      if (!token) throw new Error("No session. Please sign in.");

      const res = await fetch(`${API_BASE}/student/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load submissions");

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openResubmit = (row) => {
    setActive(row);
    setDesc(row.description || "");
    setFileObject(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setActive(null);
    setDesc("");
    setFileObject(null);
  };

  const submitOrResubmit = async () => {
    if (!active) return;

    // Must have a file if it's a new submission or a resubmission
    if (!fileObject && !active.file_url) {
      alert("Please select a file to upload.");
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();

      // Get current user's ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Could not get user info");

      let finalPath = active.file_url; // Keep old path if no new file selected

      // If user selected a NEW file
      if (fileObject) {
        const fileExt = fileObject.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, fileObject, { upsert: true });

        if (uploadError) throw uploadError;
        finalPath = uploadData.path;
      }

      const payload = {
        job_role_id: active.job_role_id,
        skill_id: active.skill_id,
        file_url: finalPath,
        description: desc?.trim() || null,
      };

      const res = await fetch(`${API_BASE}/student/proofs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");

      alert("Proof uploaded and submitted for review");
      closeModal();
      await load();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            My Submissions
          </h1>
          <p className="text-gray-400 text-lg mt-2">
            Track your proof submissions and resubmit if rejected
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          {/* Section Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
              Submission History
            </h2>
            <p className="text-gray-400">
              View status updates, advisor feedback, and your uploaded files.
            </p>
          </div>

          {/* States */}
          {loading ? (
            <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-400">Loading submissions...</p>
            </div>
          ) : err ? (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
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
          ) : rows.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
              <FiFileText size={56} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300 text-lg font-semibold mb-2">No submissions yet</p>
              <p className="text-gray-500">Submit proof from your Roadmap to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rows.map((r) => {
                const canResubmit = r.status === "rejected";
                const submittedAt = r.submitted_at
                  ? new Date(r.submitted_at).toLocaleString()
                  : "N/A";

                return (
                  <div
                    key={r.proof_id}
                    className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-lg font-black text-white truncate">
                          {r.skill?.skill_name || "Skill"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Role:{" "}
                          <span className="text-cyan-300 font-semibold">
                            {r.job_role?.job_role_name || "N/A"}
                          </span>
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    {/* Details */}
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-gray-400">Submitted</p>
                        <p className="text-gray-200 font-medium">{submittedAt}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-gray-400">File</p>
                        {r.file_url ? (
                          <button
                            type="button"
                            onClick={() => openProofFile(r.file_url)}
                            className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-semibold"
                            title="Open file"
                          >
                            <FiExternalLink size={16} />
                            Open
                          </button>
                        ) : (
                          <p className="text-gray-500">N/A</p>
                        )}
                      </div>

                      {r.description ? (
                        <div className="p-4 bg-gray-900/40 border border-gray-700 rounded-xl">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                            Description
                          </p>
                          <p className="text-gray-200">{r.description}</p>
                        </div>
                      ) : null}

                      {r.status === "rejected" && r.review_note ? (
                        <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-xl">
                          <p className="text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
                            Advisor Note
                          </p>
                          <p className="text-red-100">{r.review_note}</p>
                        </div>
                      ) : r.status === "approved" ? (
                        <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-xl text-green-200">
                          Approved
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl text-yellow-200">
                          Pending review
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-5">
                      <button
                        onClick={() => openResubmit(r)}
                        disabled={!canResubmit}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all border inline-flex items-center justify-center gap-2 ${
                          canResubmit
                            ? "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-cyan-400/20 shadow-lg hover:shadow-cyan-500/20"
                            : "bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed"
                        }`}
                        title={
                          canResubmit
                            ? "Resubmit proof"
                            : "You can only resubmit if rejected"
                        }
                      >
                        <FiUploadCloud size={18} />
                        Resubmit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-sm text-gray-500 italic">
            Tip: If a proof is rejected, read the advisor note carefully before resubmitting.
          </p>
        </div>
      </div>

      {/* Resubmit modal */}
      {open && active && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-800 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Resubmit Proof</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Skill:{" "}
                  <span className="text-cyan-300 font-semibold">
                    {active.skill?.skill_name}
                  </span>
                </p>
              </div>

              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <FiX size={24} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Upload Evidence (PDF or Image)
              </label>

              <div className="space-y-3">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFileObject(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />

                {fileObject ? (
                  <p className="text-xs text-cyan-300 font-semibold">
                    Selected: {fileObject.name}
                  </p>
                ) : active.file_url ? (
                  <p className="text-xs text-gray-500 italic">
                    Current file: {active.file_url.split("/").pop()}
                  </p>
                ) : null}
              </div>

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
                  onClick={closeModal}
                  className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition-all border border-gray-700"
                >
                  Cancel
                </button>

                <button
                  onClick={submitOrResubmit}
                  disabled={busy}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all border inline-flex items-center justify-center gap-2 ${
                    busy
                      ? "bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-cyan-400/20 shadow-lg hover:shadow-cyan-500/20"
                  }`}
                >
                  <FiUploadCloud size={18} />
                  {busy ? "Submitting..." : "Submit"}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                You can resubmit only when the status is <span className="text-red-300 font-semibold">Rejected</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
