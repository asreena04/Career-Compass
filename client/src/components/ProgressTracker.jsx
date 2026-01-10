import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Header from "../../components/Header.jsx";

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
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(pathOrUrl, 60 * 10); // 10 minutes

  if (error) {
    alert("Cannot open file: " + error.message);
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}


function StatusBadge({ status }) {
  const base = "px-3 py-1 rounded-full text-xs font-bold border";
  if (status === "approved") return <span className={`${base} bg-green-900/40 text-green-300 border-green-700`}>Approved</span>;
  if (status === "rejected") return <span className={`${base} bg-red-900/40 text-red-300 border-red-700`}>Rejected</span>;
  return <span className={`${base} bg-yellow-900/40 text-yellow-300 border-yellow-700`}>Pending</span>;
}

export default function StudentSubmissions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [fileObject, setFileObject] = useState(null);

  // simple "resubmit" modal state (file_url for now)
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null); // selected submission row
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
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

  useEffect(() => { load(); }, []);

  const openResubmit = (row) => {
    setActive(row);
    setFileUrl(row.file_url || "");
    setDesc(row.description || "");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setActive(null);
    setFileUrl("");
    setDesc("");
  };

  const submitOrResubmit = async () => {
    if (!active) return;
    
    // Validation: Must have a file if it's a new submission or a resubmission
    if (!fileObject && !active.file_url) {
      alert("Please select a file to upload.");
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();
      let finalPath = active.file_url; // Keep old path if no new file selected

      // If the user selected a NEW file
      if (fileObject) {
        const fileExt = fileObject.name.split('.').pop();
        // Create a unique filename: studentID-timestamp.ext
        const fileName = `${active.student_id || 'user'}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`; // Saved in the 'skill-proofs' bucket root or a subfolder

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, fileObject, {
            upsert: true // Overwrite if same name
          });

        if (uploadError) throw uploadError;
        finalPath = uploadData.path; // This is the string we save in the DB
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
      setFileObject(null); // Reset file selection
      await load();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <Header />
      <div className="min-h-screen p-8 bg-gray-900 text-white">
        <h1 className="text-3xl font-extrabold mb-6">My Submissions</h1>

        {loading && <div className="text-gray-300">Loading submissions...</div>}

        {!loading && err && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-xl">
            Error: {err}
          </div>
        )}

        {!loading && !err && rows.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl text-gray-300">
            No submissions yet.
          </div>
        )}

        {!loading && !err && rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rows.map((r) => {
              const canResubmit = r.status === "rejected";
              return (
                <div
                  key={r.proof_id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-extrabold">{r.skill?.skill_name || "Skill"}</p>
                      <p className="text-sm text-gray-400">
                        Role: <span className="text-teal-300 font-semibold">{r.job_role?.job_role_name || "N/A"}</span>
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-300">
                    <p>
                      <span className="text-gray-400">Submitted:</span>{" "}
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "N/A"}
                    </p>

                    <p className="break-words">
                        <span className="text-gray-400">File URL:</span>{" "}
                        {r.file_url ? (
                        <button
                            type="button"
                            onClick={() => openProofFile(r.file_url)}
                            className="text-indigo-300 hover:text-indigo-200 underline"
                        >
                            Open file
                        </button>
                        ) : (
                        "N/A"
                        )}
                    </p>

                    {r.description && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Description:</span> {r.description}
                      </p>
                    )}

                    {r.status === "rejected" && r.review_note && (
                      <div className="mt-3 bg-red-900/20 border border-red-700 rounded-lg p-3">
                        <p className="text-red-200 font-bold mb-1">Advisor note:</p>
                        <p className="text-red-100">{r.review_note}</p>
                      </div>
                    )}

                    {r.status === "approved" && (
                      <div className="mt-3 bg-green-900/20 border border-green-700 rounded-lg p-3 text-green-200">
                        Approved
                      </div>
                    )}

                    {r.status === "pending" && (
                      <div className="mt-3 bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-yellow-200">
                        Pending review
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => openResubmit(r)}
                      disabled={!canResubmit}
                      className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-400"
                      title={canResubmit ? "Resubmit proof" : "You can only resubmit if rejected"}
                    >
                      Resubmit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resubmit modal */}
        {open && active && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-xl bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-extrabold mb-2">Resubmit Proof</h2>
              <p className="text-sm text-gray-400 mb-4">
                Skill: <span className="text-teal-300 font-semibold">{active.skill?.skill_name}</span>
              </p>

              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Upload Evidence (PDF or Image)
              </label>

              <div className="space-y-3">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFileObject(e.target.files[0])}
                  className="w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700
                    cursor:pointer"
                />
                
                {fileObject && (
                  <p className="text-xs text-teal-400">Selected: {fileObject.name}</p>
                )}
                
                {!fileObject && active.file_url && (
                  <p className="text-xs text-gray-500 italic">
                    Current file: {active.file_url.split('/').pop()}
                  </p>
                )}
              </div>

              <label className="block text-sm font-semibold text-gray-300 mt-4 mb-2">
                Description (optional)
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="What is this proof showing?"
              />

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-5 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitOrResubmit}
                  disabled={busy}
                  className="px-5 py-2 bg-teal-600 text-gray-900 font-bold rounded-lg hover:bg-teal-700 disabled:bg-gray-600"
                >
                  {busy ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
