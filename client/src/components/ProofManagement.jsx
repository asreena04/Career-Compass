import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import AdvisorMenuBar from "./AdvisorMenuBar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BUCKET = "skill-proofs";

async function openProofFile(pathOrUrl) {
  if (!pathOrUrl) return;

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    window.open(pathOrUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(pathOrUrl, 60 * 10);

  if (error) {
    alert("❌ Cannot open file: " + error.message);
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

export default function ProofManagement() {
  const navigate = useNavigate();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("pending");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeProof, setActiveProof] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadProofs = async () => {
    setLoading(true);
    setErr("");
    
    console.log("🔍 Starting to load proofs...");
    
    try {
      const token = await getToken();
      console.log("🔑 Token status:", token ? "✅ Token exists" : "❌ No token");
      
      if (!token) throw new Error("No session. Please sign in.");

      const url = `${API_BASE}/advisor/proofs`;
      console.log("📡 Fetching from:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📥 Response status:", res.status);
      console.log("📥 Response headers:", Object.fromEntries(res.headers.entries()));

      // Check content type before parsing
      const contentType = res.headers.get("content-type");
      console.log("📄 Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("❌ Response is not JSON. Received:", text.substring(0, 500));
        throw new Error("Server returned HTML instead of JSON. Check if the endpoint exists.");
      }

      const data = await res.json();
      console.log("📦 Data received:", data);

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setProofs(Array.isArray(data) ? data : []);
      console.log("✅ Proofs loaded successfully:", data.length, "items");
      
    } catch (e) {
      console.error("❌ Error loading proofs:", e);
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProofs();
  }, []);

  const openReviewModal = (proof) => {
    setActiveProof(proof);
    setReviewNote(proof.review_note || "");
    setReviewOpen(true);
  };

  const closeReviewModal = () => {
    setReviewOpen(false);
    setActiveProof(null);
    setReviewNote("");
  };

  const submitReview = async (newStatus) => {
    if (!activeProof) return;
    
    if (newStatus === "rejected" && !reviewNote.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    setReviewing(true);
    console.log("📝 Submitting review:", { proof_id: activeProof.proof_id, status: newStatus });
    
    try {
      const token = await getToken();
      if (!token) throw new Error("No session. Please sign in.");

      const url = `${API_BASE}/advisor/proofs/${activeProof.proof_id}`;
      console.log("📡 PUT to:", url);

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          review_note: reviewNote.trim() || null,
        }),
      });

      console.log("📥 Review response status:", res.status);

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("❌ Review response is not JSON:", text.substring(0, 500));
        throw new Error("Server returned HTML instead of JSON");
      }

      const data = await res.json();
      console.log("📦 Review response:", data);

      if (!res.ok) throw new Error(data.error || "Review failed");

      alert(`✅ Proof ${newStatus}!`);
      closeReviewModal();
      await loadProofs();
    } catch (e) {
      console.error("❌ Review error:", e);
      alert(`❌ ${e.message}`);
    } finally {
      setReviewing(false);
    }
  };

  const handleStudentClick = (studentId) => {
    navigate('/student-management', { 
      state: { highlightStudentId: studentId } 
    });
  };

  const filteredProofs = filter === "all" 
    ? proofs 
    : proofs.filter(p => p.status === filter);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            Proof Submissions
          </h1>
          <p className="text-gray-400 text-lg mt-2">Review and manage student skill proofs</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <AdvisorMenuBar />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold">Submissions</h2>
              
              <div className="flex gap-2">
                {["pending", "approved", "rejected", "all"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${
                      filter === f
                        ? "bg-teal-600 text-gray-900"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {f} {f !== "all" && `(${proofs.filter(p => p.status === f).length})`}
                  </button>
                ))}
              </div>
            </div>

        {loading && <div className="text-gray-300">Loading proofs...</div>}

        {!loading && err && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-xl">
            <p className="font-bold mb-2">Error:</p>
            <p>{err}</p>
            <p className="text-sm mt-2">Check the browser console (F12) for more details.</p>
          </div>
        )}

        {!loading && !err && filteredProofs.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl text-gray-300">
            No {filter !== "all" ? filter : ""} submissions found.
          </div>
        )}

        {!loading && !err && filteredProofs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProofs.map((proof) => (
              <div
                key={proof.proof_id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-lg font-extrabold text-teal-300">
                      {proof.skill?.skill_name || "Skill"}
                    </p>
                    <p className="text-sm text-gray-400">
                      Role: <span className="text-gray-300 font-semibold">
                        {proof.job_role?.job_role_name || "N/A"}
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={proof.status} />
                </div>

                <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">Student</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStudentClick(proof.student_id);
                    }}
                    className="text-white font-semibold hover:text-cyan-400 transition-colors text-left hover:underline"
                  >
                    {proof.student_profile?.full_name || "Unknown"}
                  </button>
                  <p className="text-xs text-gray-500">
                    {proof.student_profile?.email || ""}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-gray-300 mb-4">
                  <p>
                    <span className="text-gray-400">Submitted:</span>{" "}
                    {proof.submitted_at ? new Date(proof.submitted_at).toLocaleString() : "N/A"}
                  </p>

                  {proof.description && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <p className="text-gray-400 text-xs mb-1">Description:</p>
                      <p className="text-gray-200">{proof.description}</p>
                    </div>
                  )}

                  {proof.review_note && (
                    <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
                      <p className="text-purple-200 font-bold mb-1 text-xs">Review Note:</p>
                      <p className="text-purple-100 text-sm">{proof.review_note}</p>
                    </div>
                  )}

                  {proof.reviewed_at && (
                    <p className="text-xs text-gray-500">
                      Reviewed: {new Date(proof.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openProofFile(proof.file_url)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                  >
                    View File
                  </button>
                  {proof.status === "pending" ? (
                    <button
                      onClick={() => openReviewModal(proof)}
                      className="flex-1 px-4 py-2 bg-teal-600 text-gray-900 font-bold rounded-lg hover:bg-teal-700"
                    >
                      Review
                    </button>
                  ) : (
                    <button
                      onClick={() => openReviewModal(proof)}
                      className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 font-bold rounded-lg hover:bg-gray-600"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {reviewOpen && activeProof && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-extrabold mb-4">Review Submission</h2>

              <div className="mb-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Student</p>
                    <button
                      onClick={() => handleStudentClick(activeProof.student_id)}
                      className="text-white font-semibold hover:text-cyan-400 transition-colors hover:underline text-left"
                    >
                      {activeProof.student_profile?.full_name || "Unknown"}
                    </button>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current Status</p>
                    <StatusBadge status={activeProof.status} />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Skill</p>
                  <p className="text-lg font-bold text-teal-300">
                    {activeProof.skill?.skill_name || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Role</p>
                  <p className="text-white font-semibold">
                    {activeProof.job_role?.job_role_name || "N/A"}
                  </p>
                </div>

                {activeProof.description && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Student Description</p>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <p className="text-gray-200">{activeProof.description}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openProofFile(activeProof.file_url)}
                  className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                >
                  📄 Open Proof File
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Review Note {activeProof.status === "pending" && "(required for rejection)"}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="Provide feedback to the student..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeReviewModal}
                  className="flex-1 px-5 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 font-semibold"
                >
                  Close
                </button>
                {activeProof.status === "pending" && (
                  <>
                    <button
                      onClick={() => submitReview("rejected")}
                      disabled={reviewing}
                      className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-600"
                    >
                      {reviewing ? "Processing..." : "Reject"}
                    </button>
                    <button
                      onClick={() => submitReview("approved")}
                      disabled={reviewing}
                      className="flex-1 px-5 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-600"
                    >
                      {reviewing ? "Processing..." : "Approve"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}