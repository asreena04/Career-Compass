import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import JobPostForm from "./JobPostForm";
import { FiEdit3, FiTrash2, FiMapPin, FiDollarSign, FiExternalLink, FiBriefcase,FiX,FiClock } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const EditDeleteJob = () => {

  // --- STATE MANAGEMENT ---
  const [jobs, setJobs] = useState([]); // Stores the list of jobs fetched from the database
  const [loading, setLoading] = useState(true); // Shows a loading spinner while data is being fetched
  const [editingJob, setEditingJob] = useState(null); // Keeps track of which job is currently being edited (opens the modal)
  const [visibleCount, setVisibleCount] = useState(3); // Controls how many jobs are shown

  // --- ACTIONS ---
  const showMore = () => setVisibleCount(prev => prev + 6); // Increases the list size by 6
  const showLess = () => setVisibleCount(3); // Resets the list to show only 3 jobs

  // Fetch only the jobs posted by the logged-in user
  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_BASE}/my-job-postings`, { headers: { Authorization: `Bearer ${token}` }, });
      const data = await res.json();
      setJobs(data);
    }
    catch (err) {
      console.error("Error fetching jobs:", err);
    }
    finally {
      setLoading(false);
    }
  };

  // Run the fetch function once when the page loads
  useEffect(() => {
    fetchMyJobs();
  }, []);

  // Delete a job posting after confirmation
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this job?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/job-postings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        // Remove the deleted job from the local list so the UI updates immediately
        setJobs(jobs.filter((j) => j.job_posting_id !== id));
      }
      else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    }
    // eslint-disable-next-line no-unused-vars
    catch (err) {
      alert("Delete failed.");
    }
  };

  // Logic to check if a job's deadline has passed
  const getStatusDetails = (deadlineStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
    const deadline = new Date(deadlineStr);

    if (deadline < today) {
      return {
        label: "Expired",
        style: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        dot: "bg-rose-500"
      };
    }
    return {
      label: "Active",
      style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      dot: "bg-emerald-500"
    };
  };





  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-teal-500/30 font-sans">

      {/* Outside Edit Modal */}
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Edit Delete Job Page currently loading */}
        {loading
        ?
        (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-10 h-10 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium tracking-wide">Syncing your data...</p>
          </div>
        )
        :
        // No jobs posted yet
        jobs.length === 0
        ?
        (
          <div className="text-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
            <FiBriefcase className="mx-auto h-12 w-12 text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">No jobs found</h3>
            <p className="text-slate-600 text-sm mt-1">Start by creating your first job posting.</p>
          </div>
        )
        :
        (
           // Display all job
          <div className="grid grid-cols-1 gap-6">
            {jobs.slice(0, visibleCount).map((job) => {
              // "Expired" or "Active" status based on application deadline
              const status = getStatusDetails(job.application_deadline);

              return (
                <div key={job.job_posting_id} className="group bg-[#121215] border border-slate-800 hover:border-teal-500/40 rounded-2xl transition-all duration-300 shadow-xl hover:-translate-y-1">
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col lg:flex-row justify-between gap-8">

                      {/* Left Side Content: Title, Status, Location, Salary Range, Description, Skill Required */}
                      <div className="flex-1">

                        {/* Title & Status Aligned Same Row */}
                        <div className="flex items-center gap-4 mb-3">
                          <h2 className="text-2xl font-bold text-slate-100 group-hover:text-white transition-colors">{job.job_title}</h2>
                          <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${status.style}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.label === 'Active' ? 'animate-pulse' : ''}`} />{status.label}
                          </span>
                        </div>

                        {/* Location & Salary Range Aligned Same Row */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 mb-6 text-sm font-medium">
                          <span className="flex items-center gap-2"><FiMapPin className="text-teal-500" /> {job.location}</span>
                          <span className="flex items-center gap-2"><FiDollarSign className="text-teal-500" /> {job.salary_range || "Competitive"}</span>
                        </div>

                        {/* Description */}
                        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-6 border-l-2 border-slate-800 pl-4">{job.description}</p>

                        {/* Skill Required */}
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((s, idx) => (
                            <span key={idx} className="bg-slate-800/50 text-teal-100/70 px-3 py-1 rounded-md text-[11px] font-bold border border-slate-700/50 group-hover:border-teal-500/20">
                              {s.name.toUpperCase()}
                            </span>
                          ))}
                        </div>

                      </div> {/* End Left Side Content */}

                      {/* Right Side Content: Application Link, Application Deadline, Edit Button, Delete Button */}
                      <div className="lg:w-64 flex flex-col justify-between gap-6 border-t lg:border-t-0 lg:border-l border-slate-800/60 pt-6 lg:pt-0 lg:pl-8">

                        {/* Application Link & Application Deadline Aligned Same Column */}
                        <div className="space-y-5">

                          {/* Application Link */}
                          <div>
                            {/* Label */}
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2 flex items-center gap-2"><FiExternalLink/>Application Link</p>
                            {/* Link */}
                            <a href={job.application_link} target="_blank" rel="noreferrer" className="text-teal-400 hover:text-white transition-colors text-xs truncate block font-medium">View Live Portal</a>
                          </div>

                          {/* Application Deadline */}
                          <div>
                            {/* Label */}
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1 flex items-center gap-2"><FiClock/>Deadline</p>
                            {/* Date Type: 2004 AUG 19 */}
                            <p className="text-slate-200 font-mono text-xs">
                              {new Date(job.application_deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>

                        </div>

                        {/* Edit Button & Delete Button Aligned Same Row */}
                        <div className="flex gap-2">

                          {/* Edit Button */}
                          <button onClick={() => setEditingJob(job)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all active:scale-95 text-sm">
                            <FiEdit3/>Edit
                          </button>

                          {/* Delete Button */}
                          <button onClick={() => handleDelete(job.job_posting_id)} className="px-4 py-2.5 bg-slate-900 hover:bg-rose-600/20 hover:text-rose-500 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-rose-500/50 active:scale-95">
                            <FiTrash2 size={18}/>
                          </button>

                        </div>

                      </div> {/* End Right Side Content */}

                    </div>
                  </div>
                </div>
              ); // End return each job post card

            })}
          </div> // End display all job card
        )}

        {!loading && jobs.length > 3 && (
          // Show more & show less button to show more or show less job post card
          <div className="mt-12 flex flex-col items-center gap-6 border-t border-slate-900 pt-10">

            <div className="flex flex-wrap justify-center gap-4">

              {/* Only show "Show More" if there are hidden jobs remaining */}
              {visibleCount < jobs.length && (
                <button
                  onClick={showMore}
                  className="group flex items-center gap-2 px-8 py-3 bg-teal-500 text-black font-bold rounded-xl transition-all hover:bg-teal-400 active:scale-95 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                >
                  Show More
                </button>
              )} {/* End Show More Button */}

              {/* Only show "Show Less" if we had show all job post card */}
              {visibleCount > 3 && (
                <button
                  onClick={showLess}
                  className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl font-bold transition-all active:scale-95"
                >
                  Show Less
                </button>
              )} {/* End Show Less Button */}

            </div>

            {/* "DISPLAYING 5 / 5 TOTAL" after click show more or show less button */}
            <p className="text-slate-600 text-[10px] uppercase tracking-[0.3em] font-black">
              Displaying {Math.min(visibleCount, jobs.length)} <span className="text-slate-800 mx-2">/</span> {jobs.length} Total
            </p>

          </div> // End Show more & show less button
        )}

      </div> {/* End Outside Edit Modal */}

      {/* Inside Edit Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">

          <div className="relative w-full max-w-5xl bg-[#111114] rounded-3xl shadow-2xl border border-slate-800 my-8">

            {/* Modal Title */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-3"><FiEdit3 className="text-teal-400" /> Modify Listing</h3>
              <button onClick={() => setEditingJob(null)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-all">
                <FiX size={24} />
              </button>
            </div>

            {/* Modal for Edit Post Form's Content */}
            <div className="max-h-[70vh] overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-teal-900 scrollbar-track-transparent">
              <JobPostForm
                isEditing={true}
                initialData={editingJob}
                onPostSuccess={() => {
                  setEditingJob(null);
                  fetchMyJobs();
                }}
              />
            </div>

          </div>

        </div>
      )} {/* End Inside Edit Modal */}

    </div>
  );
};

export default EditDeleteJob;